import argparse
import logging
import os
import random
import time

import albumentations as A
from albumentations.pytorch import ToTensorV2
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import (
    auc, classification_report, confusion_matrix,
    f1_score, recall_score, roc_curve,
)
from torch.optim.lr_scheduler import CosineAnnealingLR, LinearLR, SequentialLR
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from tqdm import tqdm

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
NOTEBOOK_DEFAULTS = dict(
    data_dir="/kaggle/input/datasets/iris0209/railly-dataset-gender-detection/railly-dataset-10k",
    output_dir="./output",
    batch_size=64,
    epochs=60,
    lr=3e-4,
    weight_decay=1e-4,
    num_workers=0,
    img_size=224,
    seed=42,
    warmup_epochs=5,
    freeze_epochs=8,        # shorter freeze — backbone needs to relearn for top-down
    patience=10,
    grad_clip=1.0,
    label_smoothing=0.1,
    monitor="val_f1",
    mixup_prob=0.2,
    male_threshold=0.45,    # fallback; overridden at eval time by ROC threshold search
    target_male_recall=0.90,  # minimum male recall to guarantee at eval threshold
)

MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def parse_args():
    p = argparse.ArgumentParser()
    for k, v in NOTEBOOK_DEFAULTS.items():
        if isinstance(v, bool):
            p.add_argument(f"--{k}", action="store_true" if v else "store_false")
        else:
            p.add_argument(f"--{k}", type=type(v), default=v)
    args, _ = p.parse_known_args()
    return args

# ---------------------------------------------------------------------------
# Reproducibility + Logging
# ---------------------------------------------------------------------------
def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

def setup_logging(output_dir):
    logger = logging.getLogger("gender_clf")
    logger.handlers.clear()
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    ch = logging.StreamHandler(); ch.setFormatter(fmt); logger.addHandler(ch)
    fh = logging.FileHandler(os.path.join(output_dir, "training.log"))
    fh.setFormatter(fmt); logger.addHandler(fh)
    return logger

# ---------------------------------------------------------------------------
# Albumentations wrapper for ImageFolder (PIL -> numpy -> tensor)
# ---------------------------------------------------------------------------
class AlbumentationsTransform:
    def __init__(self, transform):
        self.transform = transform

    def __call__(self, img):
        return self.transform(image=np.array(img))["image"]

# ---------------------------------------------------------------------------
# Transforms — rotation-invariant for top-down camera
# ---------------------------------------------------------------------------
def build_transforms(img_size):
    train_albu = A.Compose([
        A.RandomResizedCrop(size=(img_size, img_size), scale=(0.75, 1.0)),
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.5),              # valid for top-down
        A.RandomRotate90(p=0.5),            # valid for top-down
        A.Rotate(limit=45, p=0.7),          # aggressive rotation for overhead views
        A.Perspective(scale=(0.05, 0.1), p=0.3),  # overhead angle variation
        A.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.4, hue=0.1, p=0.7),
        A.GaussNoise(std_range=(0.012, 0.025), p=0.3),
        A.CoarseDropout(
            num_holes_range=(2, 6),
            hole_height_range=(8, 20),
            hole_width_range=(8, 20),
            p=0.4,
        ),
        # p=0.15 not 1.0 — occasional grayscale forces structural features
        # num_output_channels=3 keeps tensor shape compatible with model
        A.ToGray(num_output_channels=3, p=0.15),
        A.Normalize(mean=MEAN, std=STD),
        ToTensorV2(),
    ])

    eval_tf = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
        # NO Grayscale here — eval should match what model sees at inference
    ])

    return AlbumentationsTransform(train_albu), eval_tf

# ---------------------------------------------------------------------------
# DataLoaders + Model
# ---------------------------------------------------------------------------
def build_loaders(data_dir, batch_size, num_workers, img_size):
    train_tf, eval_tf = build_transforms(img_size)
    train_ds = datasets.ImageFolder(os.path.join(data_dir, "train"), train_tf)
    val_ds   = datasets.ImageFolder(os.path.join(data_dir, "val"),   eval_tf)
    test_ds  = datasets.ImageFolder(os.path.join(data_dir, "test"),  eval_tf)

    persist = num_workers > 0
    loader_kw = dict(
        batch_size=batch_size, num_workers=num_workers, pin_memory=True,
        persistent_workers=persist, prefetch_factor=2 if persist else None,
    )
    return (
        DataLoader(train_ds, shuffle=True,  **loader_kw),
        DataLoader(val_ds,   shuffle=False, **loader_kw),
        DataLoader(test_ds,  shuffle=False, **loader_kw),
        train_ds, val_ds, test_ds,
    )

def build_model(num_classes=2):
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    model.classifier[2] = nn.Dropout(p=0.5)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, num_classes)
    return model

def freeze_backbone(model):
    for name, param in model.named_parameters():
        if not name.startswith("classifier"):
            param.requires_grad = False

def unfreeze_all(model):
    for param in model.parameters():
        param.requires_grad = True

# ---------------------------------------------------------------------------
# Schedulers
# ---------------------------------------------------------------------------
def build_scheduler(optimizer, warmup_epochs, total_epochs):
    warmup = LinearLR(optimizer, start_factor=0.1, end_factor=1.0, total_iters=max(warmup_epochs, 1))
    cosine = CosineAnnealingLR(optimizer, T_max=max(total_epochs - warmup_epochs, 1), eta_min=1e-6)
    return SequentialLR(optimizer, schedulers=[warmup, cosine], milestones=[warmup_epochs])


# ---------------------------------------------------------------------------
# Mixup
# ---------------------------------------------------------------------------
def mixup_batch(imgs, labels, alpha=0.2):
    lam = np.random.beta(alpha, alpha)
    idx = torch.randperm(imgs.size(0), device=imgs.device)
    return lam * imgs + (1 - lam) * imgs[idx], labels, labels[idx], lam

# ---------------------------------------------------------------------------
# Training epoch — threshold-based male prediction
# ---------------------------------------------------------------------------
def run_epoch(model, loader, criterion, device, training,
              grad_clip=0.0, desc="", optimizer=None, scaler=None,
              mixup_prob=0.0, male_idx=1, threshold=0.45):
    model.train() if training else model.eval()
    total_loss = 0.0
    all_preds, all_labels = [], []
    ctx  = torch.enable_grad() if training else torch.no_grad()
    pbar = tqdm(loader, desc=desc, leave=False, dynamic_ncols=True)

    with ctx:
        for imgs, labels in pbar:
            imgs, labels = imgs.to(device), labels.to(device)
            if training:
                optimizer.zero_grad(set_to_none=True)

            with torch.autocast(device_type=device.type, enabled=(device.type == "cuda")):
                if training and random.random() < mixup_prob:
                    imgs, labels_a, labels_b, lam = mixup_batch(imgs, labels)
                    logits = model(imgs)
                    loss = lam * criterion(logits, labels_a) + (1 - lam) * criterion(logits, labels_b)
                else:
                    logits = model(imgs)
                    loss   = criterion(logits, labels)

            if training:
                scaler.scale(loss).backward()
                if grad_clip > 0:
                    scaler.unscale_(optimizer)
                    nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
                scaler.step(optimizer)
                scaler.update()

            probs       = torch.softmax(logits.detach(), dim=1)
            batch_preds = (probs[:, male_idx] > threshold).long().cpu()
            all_preds.extend(batch_preds.numpy())
            all_labels.extend(labels.cpu().numpy())
            total_loss += loss.item() * imgs.size(0)
            running_acc = (np.array(all_preds) == np.array(all_labels)).mean()
            pbar.set_postfix(loss=f"{loss.item():.4f}", acc=f"{running_acc:.4f}")

    n           = len(all_labels)
    epoch_loss  = total_loss / n
    epoch_acc   = (np.array(all_preds) == np.array(all_labels)).mean()
    epoch_f1    = f1_score(all_labels, all_preds, average="macro", zero_division=0)
    male_recall = recall_score(all_labels, all_preds, pos_label=male_idx, zero_division=0)
    return epoch_loss, epoch_acc, epoch_f1, male_recall

# ---------------------------------------------------------------------------
# Plot helpers
# ---------------------------------------------------------------------------
def find_optimal_threshold(model, loader, device, male_idx, target_recall=0.90):
    model.eval()
    probs_list, labels_list = [], []
    with torch.no_grad():
        for imgs, labels in tqdm(loader, desc="Threshold search", leave=False):
            imgs = imgs.to(device)
            with torch.autocast(device_type=device.type, enabled=(device.type == "cuda")):
                logits = model(imgs)
            probs = torch.softmax(logits, dim=1)
            probs_list.extend(probs[:, male_idx].cpu().numpy())
            labels_list.extend(labels.numpy())
    la  = np.array(labels_list)
    pra = np.array(probs_list)
    # roc_curve returns thresholds in decreasing order; tpr is increasing
    _, tpr, thresholds = roc_curve(la, pra, pos_label=male_idx)
    valid = np.where(tpr >= target_recall)[0]
    if len(valid) == 0:
        return 0.5
    return float(thresholds[valid[0]])  # highest threshold still meeting target_recall


def strip_compile_prefix(sd):
    return {k.replace("_orig_mod.", ""): v for k, v in sd.items()}

def plot_curves(history, output_dir):
    fig, axes = plt.subplots(1, 4, figsize=(22, 4))
    pairs = [
        ("train_loss", "val_loss", "Loss"),
        ("train_acc",  "val_acc",  "Accuracy"),
        ("val_f1",     None,       "Val F1"),
        ("val_male_recall", None,  "Male Recall (alert metric)"),
    ]
    for ax, (k1, k2, title) in zip(axes, pairs):
        ax.plot(history[k1], label=k1)
        if k2:
            ax.plot(history[k2], label=k2)
        ax.set_title(title); ax.set_xlabel("Epoch"); ax.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "curves.png"), dpi=150)
    plt.show()

def plot_confusion_matrix(labels, preds, classes, output_dir, title="CM", filename="cm.png"):
    cm = confusion_matrix(labels, preds)
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=classes, yticklabels=classes, ax=ax)
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual"); ax.set_title(title)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, filename), dpi=150)
    plt.show()

def plot_roc(labels, probs, pos_name, output_dir, filename="roc.png"):
    fpr, tpr, _ = roc_curve(labels, probs)
    plt.figure(figsize=(5, 4))
    plt.plot(fpr, tpr, label=f"AUC={auc(fpr, tpr):.3f}")
    plt.plot([0, 1], [0, 1], "k--")
    plt.xlabel("FPR"); plt.ylabel("TPR")
    plt.title(f"ROC ({pos_name})"); plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, filename), dpi=150)
    plt.show()

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    args   = parse_args()
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    os.makedirs(args.output_dir, exist_ok=True)
    set_seed(args.seed)
    logger = setup_logging(args.output_dir)

    logger.info("=" * 70)
    logger.info("MobileNetV3-Small | Top-down gender | Male alert focus")
    logger.info(f"Device: {DEVICE} | LR: {args.lr} | male_threshold: {args.male_threshold}")
    logger.info("=" * 70)

    train_loader, val_loader, test_loader, train_ds, val_ds, test_ds = build_loaders(
        args.data_dir, args.batch_size, args.num_workers, args.img_size
    )

    idx_to_class = {v: k for k, v in train_ds.class_to_idx.items()}
    CLASSES  = [idx_to_class[i] for i in range(len(idx_to_class))]
    male_idx = CLASSES.index("male")   # robust lookup, doesn't assume ordering
    logger.info(f"Classes: {CLASSES} | male_idx={male_idx}")
    logger.info(f"Train: {len(train_ds)} | Val: {len(val_ds)} | Test: {len(test_ds)}")

    model = build_model(len(CLASSES)).to(DEVICE)
    freeze_backbone(model)
    logger.info(f"Backbone frozen for first {args.freeze_epochs} epochs")

    in_notebook = "KAGGLE_KERNEL_RUN_TYPE" in os.environ or "COLAB_GPU" in os.environ
    if hasattr(torch, "compile") and not in_notebook:
        model = torch.compile(model)

    # Male errors cost 1.5x — softened from 2.0 to reduce female false-alarm bias
    weights   = torch.tensor([1.0, 1.5], dtype=torch.float32).to(DEVICE)
    criterion = nn.CrossEntropyLoss(weight=weights, label_smoothing=args.label_smoothing)
    logger.info("Loss weights: female=1.0, male=1.5")

    trainable = list(filter(lambda p: p.requires_grad, model.parameters()))
    optimizer = optim.AdamW(trainable, lr=args.lr, weight_decay=args.weight_decay)
    scheduler = build_scheduler(optimizer, args.warmup_epochs, args.epochs)
    scaler    = torch.amp.GradScaler("cuda", enabled=(DEVICE.type == "cuda"))

    logger.info("Running initial validation...")
    _, init_acc, init_f1, init_recall = run_epoch(
        model, val_loader, criterion, DEVICE, training=False, desc="Init Val",
        male_idx=male_idx, threshold=args.male_threshold,
    )
    logger.info(f"Init | acc={init_acc:.4f} F1={init_f1:.4f} male_recall={init_recall:.4f}")

    history = {
        "train_loss": [], "val_loss": [],
        "train_acc":  [], "val_acc":  [],
        "val_f1":     [], "val_male_recall": [],
    }
    best_metric    = 0.0
    patience_count = 0

    for epoch in range(1, args.epochs + 1):
        if epoch == args.freeze_epochs + 1:
            unfreeze_all(model)
            remaining   = args.epochs - epoch + 1
            backbone_lr = args.lr * 0.15       # aggressive for top-down — backbone needs to relearn
            optimizer   = optim.AdamW([
                {"params": model.features.parameters(),   "lr": backbone_lr,  "weight_decay": 1e-3},
                {"params": model.classifier.parameters(), "lr": args.lr,       "weight_decay": 1e-4},
            ])
            warmup_after      = 3
            scheduler = build_scheduler(optimizer, warmup_after, remaining)
            scaler    = torch.amp.GradScaler("cuda", enabled=(DEVICE.type == "cuda"))
            logger.info(f"Epoch {epoch}: Full fine-tuning | backbone LR={backbone_lr:.2e}")

        t0 = time.time()
        tr_loss, tr_acc, tr_f1, tr_recall = run_epoch(
            model, train_loader, criterion, DEVICE, training=True,
            grad_clip=args.grad_clip, desc=f"Train {epoch:02d}",
            optimizer=optimizer, scaler=scaler, mixup_prob=args.mixup_prob,
            male_idx=male_idx, threshold=args.male_threshold,
        )
        vl_loss, vl_acc, vl_f1, vl_recall = run_epoch(
            model, val_loader, criterion, DEVICE, training=False,
            desc=f"Val {epoch:02d}",
            male_idx=male_idx, threshold=args.male_threshold,
        )

        scheduler.step()

        history["train_loss"].append(tr_loss);       history["val_loss"].append(vl_loss)
        history["train_acc"].append(tr_acc);         history["val_acc"].append(vl_acc)
        history["val_f1"].append(vl_f1);             history["val_male_recall"].append(vl_recall)

        elapsed    = time.time() - t0
        current_lr = scheduler.get_last_lr()[0]
        logger.info(
            f"Epoch {epoch:02d} | loss {tr_loss:.4f} acc {tr_acc:.4f} | "
            f"val loss {vl_loss:.4f} acc {vl_acc:.4f} F1 {vl_f1:.4f} "
            f"male_recall {vl_recall:.4f} | lr {current_lr:.2e} | {elapsed:.1f}s"
        )

        if vl_f1 > best_metric:
            best_metric    = vl_f1
            patience_count = 0
            torch.save({
                "epoch": epoch,
                "model_state_dict":     model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "scheduler_state_dict": scheduler.state_dict(),
                "best_metric":          best_metric,
            }, os.path.join(args.output_dir, "best_model.pth"))
            logger.info(f"→ New best F1={best_metric:.4f} | male_recall={vl_recall:.4f}")
        else:
            patience_count += 1
            if patience_count >= args.patience:
                logger.info(f"Early stopping at epoch {epoch}")
                break

    logger.info(f"\nBest val_f1: {best_metric:.4f}")

    best_ckpt = torch.load(os.path.join(args.output_dir, "best_model.pth"), map_location=DEVICE)
    state     = strip_compile_prefix(best_ckpt["model_state_dict"])
    model.load_state_dict(state)
    logger.info(f"Loaded best checkpoint from epoch {best_ckpt['epoch']}")

    # Tune threshold on val set to meet target male recall
    tuned_threshold = find_optimal_threshold(
        model, val_loader, DEVICE, male_idx, target_recall=args.target_male_recall
    )
    logger.info(
        f"ROC threshold search: target_male_recall={args.target_male_recall} "
        f"→ threshold {args.male_threshold:.3f} → {tuned_threshold:.3f}"
    )
    args.male_threshold = tuned_threshold

    # ------------------------------------------------------------------
    # Evaluation with TTA + threshold-based male detection
    # ------------------------------------------------------------------
    def evaluate_split(loader, split):
        model.eval()
        preds_list, labels_list, probs_list = [], [], []

        # TTA: rotation-invariant for top-down, spatial only (no re-normalize)
        TTA_TF = transforms.Compose([
            transforms.RandomResizedCrop(args.img_size, scale=(0.85, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.5),
        ])
        N_TTA = 5

        with torch.no_grad():
            for imgs, labels in tqdm(loader, desc=f"{split} eval", leave=False):
                imgs       = imgs.to(DEVICE)
                logits_sum = torch.zeros(imgs.size(0), len(CLASSES), device=DEVICE)
                for _ in range(N_TTA):
                    aug = torch.stack([TTA_TF(img) for img in imgs])
                    with torch.autocast(device_type=DEVICE.type, enabled=(DEVICE.type == "cuda")):
                        logits_sum += model(aug)
                logits = logits_sum / N_TTA

                probs = torch.softmax(logits, dim=1)
                preds = (probs[:, male_idx] > args.male_threshold).long()
                preds_list.extend(preds.cpu().numpy())
                labels_list.extend(labels.numpy())
                probs_list.extend(probs[:, male_idx].cpu().numpy())

        la  = np.array(labels_list)
        pa  = np.array(preds_list)
        pra = np.array(probs_list)

        male_recall = recall_score(la, pa, pos_label=male_idx, zero_division=0)
        logger.info(f"\n-- {split.upper()} | threshold={args.male_threshold} | male_recall={male_recall:.4f}")
        logger.info("\n" + classification_report(la, pa, target_names=CLASSES))
        plot_confusion_matrix(la, pa, CLASSES, args.output_dir,
                              title=f"CM {split}", filename=f"cm_{split}.png")
        plot_roc(la, pra, "male", args.output_dir, filename=f"roc_{split}.png")

    logger.info("\nEvaluating VAL ...")
    evaluate_split(val_loader, "val")
    logger.info("\nEvaluating TEST ...")
    evaluate_split(test_loader, "test")

    plot_curves(history, args.output_dir)

    try:
        raw = build_model(len(CLASSES)).to(DEVICE)
        raw.load_state_dict(state)
        raw.eval()
        scripted = torch.jit.trace(raw, torch.zeros(1, 3, args.img_size, args.img_size, device=DEVICE))
        ts_path  = os.path.join(args.output_dir, "mobilenetv3_ver4.pt")
        scripted.save(ts_path)
        logger.info(f"TorchScript saved -> {ts_path}")
    except Exception as exc:
        logger.warning(f"TorchScript export failed: {exc}")

    logger.info(f"\nDone. Outputs at: {args.output_dir}/")

if __name__ == "__main__":
    main()