"""
====================================================
ACTION ITEM CLASSIFIER - Memory Optimized Version
====================================================
"""

import json
import os
import gc
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

import torch
from torch.utils.data import Dataset

from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    TrainingArguments,
    Trainer,
)

# ============================================
# CONFIG - MEMORY OPTIMIZED
# ============================================
DATASET_PATH = "../dataset/action_items_dataset.json"
OUTPUT_DIR = "../trained-model/action-item-classifier"
MODEL_NAME = "distilbert-base-uncased"

# REDUCED FOR LOW MEMORY
NUM_EPOCHS = 5          # reduced from 10
BATCH_SIZE = 4          # reduced from 8
LEARNING_RATE = 2e-5
MAX_LENGTH = 64         # reduced from 128

# Clear memory
gc.collect()
torch.cuda.empty_cache() if torch.cuda.is_available() else None

print("=" * 50)
print("ACTION ITEM CLASSIFIER - TRAINING (Low Memory)")
print("=" * 50)

# ============================================
# STEP 1: LOAD DATASET
# ============================================
print("\n📂 Loading dataset...")

with open(DATASET_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

texts = [item["text"] for item in data]
labels = [item["label"] for item in data]

print(f"   Total samples: {len(texts)}")
print(f"   Action items (1): {sum(labels)}")
print(f"   Not action items (0): {len(labels) - sum(labels)}")

# Split into training (80%) and validation (20%)
train_texts, val_texts, train_labels, val_labels = train_test_split(
    texts, labels, test_size=0.2, random_state=42, stratify=labels
)

print(f"   Training samples: {len(train_texts)}")
print(f"   Validation samples: {len(val_texts)}")

# ============================================
# STEP 2: TOKENIZE
# ============================================
print("\n🔤 Tokenizing text...")

tokenizer = DistilBertTokenizer.from_pretrained(MODEL_NAME)

train_encodings = tokenizer(
    train_texts,
    truncation=True,
    padding=True,
    max_length=MAX_LENGTH,
    return_tensors="pt",
)

val_encodings = tokenizer(
    val_texts,
    truncation=True,
    padding=True,
    max_length=MAX_LENGTH,
    return_tensors="pt",
)

print("   ✅ Tokenization complete!")

# ============================================
# STEP 3: CREATE PYTORCH DATASET
# ============================================

class ActionItemDataset(Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: val[idx] for key, val in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx])
        return item

    def __len__(self):
        return len(self.labels)


train_dataset = ActionItemDataset(train_encodings, train_labels)
val_dataset = ActionItemDataset(val_encodings, val_labels)

# ============================================
# STEP 4: LOAD MODEL
# ============================================
print("\n🤖 Loading pre-trained DistilBERT model...")

model = DistilBertForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=2,
    id2label={0: "NOT_ACTION_ITEM", 1: "ACTION_ITEM"},
    label2id={"NOT_ACTION_ITEM": 0, "ACTION_ITEM": 1},
)

print("   ✅ Model loaded!")

# ============================================
# STEP 5: METRICS
# ============================================

def compute_metrics(pred):
    labels = pred.label_ids
    preds = np.argmax(pred.predictions, axis=-1)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, preds, average="binary"
    )
    acc = accuracy_score(labels, preds)
    return {
        "accuracy": acc,
        "f1": f1,
        "precision": precision,
        "recall": recall,
    }

# ============================================
# STEP 6: TRAINING CONFIG - MEMORY OPTIMIZED
# ============================================
print("\n⚙️  Setting up training (memory optimized)...")

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=NUM_EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    learning_rate=LEARNING_RATE,
    weight_decay=0.01,
    
    # MEMORY OPTIMIZATION
    eval_strategy="epoch",
    save_strategy="no",          # DON'T save checkpoints (saves memory)
    load_best_model_at_end=False, # Don't load best model
    
    # Disable unused features
    logging_steps=20,
    report_to="none",
    
    # Memory optimizations
    dataloader_pin_memory=False,  # Fixes the warning
    gradient_accumulation_steps=2, # Accumulate gradients
    fp16=False,                   # Keep false for CPU
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    compute_metrics=compute_metrics,
)

# ============================================
# STEP 7: TRAIN
# ============================================
print("\n🚀 TRAINING STARTED...")
print("   This will take 5-15 minutes.\n")

trainer.train()

# ============================================
# STEP 8: EVALUATE
# ============================================
print("\n📊 EVALUATION RESULTS:")
results = trainer.evaluate()
for key, value in results.items():
    if isinstance(value, float):
        print(f"   {key}: {value:.4f}")

# ============================================
# STEP 9: SAVE MODEL (Memory Efficient Way)
# ============================================
print(f"\n💾 Saving model to {OUTPUT_DIR}...")

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Save in smaller chunks to avoid memory error
model.config.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

# Save model weights using torch.save (more memory efficient)
torch.save(model.state_dict(), os.path.join(OUTPUT_DIR, "pytorch_model.bin"))

print("   ✅ Model saved!")

# ============================================
# STEP 10: QUICK TEST
# ============================================
print("\n🧪 QUICK TEST:")

test_sentences = [
    "John please finish the report by Friday",
    "That sounds like a great idea",
    "Sarah needs to send the report by Monday",
    "The weather is nice today",
    "Can you deploy the hotfix tonight",
]

model.eval()

for sentence in test_sentences:
    inputs = tokenizer(
        sentence,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=MAX_LENGTH,
    )
    
    with torch.no_grad():
        outputs = model(**inputs)
        prediction = torch.argmax(outputs.logits, dim=-1).item()
        confidence = torch.softmax(outputs.logits, dim=-1).max().item()

    label = "✅ ACTION" if prediction == 1 else "❌ Not action"
    print(f"   {label} ({confidence:.0%}) → \"{sentence}\"")

# Cleanup
gc.collect()

print("\n" + "=" * 50)
print("🎉 TRAINING COMPLETE!")
print(f"Model saved at: {OUTPUT_DIR}")
print("=" * 50)