<template>
  <div class="container">
    <h1 class="title">神経衰弱 × 囚人のジレンマ</h1>

    <!-- ゲーム状態 -->
    <div class="game-status">
      <div class="status-header">
        <div class="round-info">ターン {{ turnCount }}</div>
        <div class="turn-info">
          先手: {{ firstPlayerLabel }}　 後手: {{ secondPlayerLabel }}
        </div>
        <div class="scores">
          <div class="score-a">A: {{ scores.A }}点</div>
          <div class="score-b">B: {{ scores.B }}点</div>
        </div>
      </div>

      <!-- セットアップ -->
      <div v-if="phase === 'setup'" class="phase-content">
        <button class="btn btn-primary btn-large" @click="startGame">
          ゲーム開始
        </button>
      </div>

      <!-- 先手：カード選択 + 戦略 -->
      <div v-if="phase === 'choose'" class="phase-content">
        <p class="phase-title" :class="firstPlayerClass">
          {{ firstPlayerLabel }} のターン: カードを選択し戦略を決定
        </p>
        <div v-if="selectedCard !== null" class="strategy-buttons">
          <button class="btn btn-success" @click="chooseStrategy('cooperate')">
            協力（正しい位置）
          </button>
          <button class="btn btn-danger" @click="chooseStrategy('defect')">
            裏切り（30% 真・70% 偽）
          </button>
        </div>
      </div>

      <!-- 後手：推測 -->
      <div v-if="phase === 'guess'" class="phase-content">
        <p class="phase-title" :class="secondPlayerClass">
          {{ secondPlayerLabel }} のターン: ヒントを参考にカードを選択
        </p>
        <div class="message-info">ヒントはカードの点滅で示されています</div>
      </div>

      <!-- 結果 -->
      <div v-if="phase === 'result'" class="phase-content">
        <div class="result-box">
          <p class="result-title">結果</p>
          <p class="result-details">
            {{ firstPlayerLabel }} の戦略:
            {{ lastResult.strategy === "cooperate" ? "協力" : "裏切り" }}
          </p>
          <p class="result-details">
            {{ secondPlayerLabel }} の選択:
            {{ lastResult.success ? "正解" : "不正解" }}
          </p>
          <p class="result-scores">
            得点 - {{ firstPlayerLabel }}:+{{ lastResult.firstScore }},
            {{ secondPlayerLabel }}:+{{ lastResult.secondScore }}
          </p>
        </div>
      </div>

      <!-- 終了 -->
      <div v-if="phase === 'gameOver'" class="phase-content game-over">
        <h2 class="game-over-title">ゲーム終了!</h2>
        <p class="game-over-winner">{{ winnerMessage }}</p>
        <button class="btn btn-primary btn-large" @click="startGame">
          新しいゲーム
        </button>
      </div>
    </div>

    <!-- カード -->
    <div v-if="phase !== 'setup'" class="cards-container">
      <div class="cards-grid">
        <div
          v-for="(card, idx) in cards"
          :key="idx"
          :class="cardClass(idx)"
          @click="onCardClick(idx)"
        >
          <div v-if="revealed[idx]" :class="suitClass(card.suit)">
            {{ card.suit }}{{ card.number }}
          </div>
          <div v-else class="card-back">?</div>
        </div>
      </div>
    </div>

    <!-- ルール -->
    <div class="rules">
      <h3 class="rules-title">ルール</h3>
      <div class="rules-list">
        <p>• 先手がカードを選び「協力 / 裏切り」を宣言</p>
        <p>• 協力: 位置を正しく点滅　裏切り: 30%で正・70%で誤位置を点滅</p>
        <p>• 後手がカードを当てる（数字が同じなら正解）</p>
        <p>
          • 得点: 協力成功(3,7) / 協力失敗(1,1) / 裏切り成功(1,8) /
          裏切り失敗(5,2)
        </p>
        <p>• 全カードが表になった時点で終了</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

/* ---------- 定数 ---------- */
const suits = ["♠", "♥", "♦", "♣"];
const numbers = [1, 2, 3, 4, 5];

/* ---------- 状態 ---------- */
const cards = ref([]); // 全カード
const revealed = ref([]); // 表向きフラグ
const phase = ref("setup"); // setup | choose | guess | result | gameOver
const firstPlayer = ref("A"); // 'A' or 'B'
const selectedCard = ref(null); // 先手が選んだ index
const hintIndex = ref(null); // 点滅させる index
const firstStrategy = ref(null); // 'cooperate' | 'defect'
const scores = ref({ A: 0, B: 0 });
const turnCount = ref(0);
const lastResult = ref({}); // 結果表示用

/* ---------- 表示用 computed ---------- */
const firstPlayerLabel = computed(() =>
  firstPlayer.value === "A" ? "プレイヤーA" : "プレイヤーB"
);
const secondPlayerLabel = computed(() =>
  firstPlayer.value === "A" ? "プレイヤーB" : "プレイヤーA"
);
const firstPlayerClass = computed(() =>
  firstPlayer.value === "A" ? "player-a" : "player-b"
);
const secondPlayerClass = computed(() =>
  firstPlayer.value === "A" ? "player-b" : "player-a"
);
const winnerMessage = computed(() => {
  if (scores.value.A === scores.value.B) return "引き分け!";
  return scores.value.A > scores.value.B
    ? "プレイヤーAの勝利!"
    : "プレイヤーBの勝利!";
});

/* ---------- 初期化 ---------- */
function initDeck() {
  const deck = [];
  suits.forEach((s) =>
    numbers.forEach((n) => deck.push({ suit: s, number: n }))
  );
  cards.value = deck.sort(() => Math.random() - 0.5);
  revealed.value = Array(20).fill(false);
}

/* ---------- ゲーム開始 ---------- */
function startGame() {
  initDeck();
  scores.value = { A: 0, B: 0 };
  turnCount.value = 0;
  firstPlayer.value = "A";
  resetRound();
  phase.value = "choose";
}

/* ---------- ラウンドリセット ---------- */
function resetRound() {
  selectedCard.value = null;
  hintIndex.value = null;
  firstStrategy.value = null;
  phase.value = "choose";
  turnCount.value += 1;
}

/* ---------- カードクリック ---------- */
function onCardClick(idx) {
  if (phase.value === "choose" && selectedCard.value === null) {
    // 先手がカードを選択
    selectedCard.value = idx;
  } else if (phase.value === "guess") {
    // 後手が推測
    handleGuess(idx);
  }
}

/* ---------- 戦略決定 ---------- */
function chooseStrategy(strategy) {
  if (phase.value !== "choose" || selectedCard.value === null) return;
  firstStrategy.value = strategy;

  // ヒント位置決定
  if (strategy === "cooperate") {
    hintIndex.value = selectedCard.value;
  } else {
    const tellTruth = Math.random() < 0.3;
    if (tellTruth) {
      hintIndex.value = selectedCard.value;
    } else {
      const pool = Array.from({ length: 20 }, (_, i) => i).filter(
        (i) => i !== selectedCard.value
      );
      hintIndex.value = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  phase.value = "guess";
}

/* ---------- 推測 ---------- */
function handleGuess(guessIdx) {
  if (phase.value !== "guess") return;

  const cardFirst = cards.value[selectedCard.value];
  const cardGuess = cards.value[guessIdx];
  const success = cardFirst.number === cardGuess.number;

  // 得点計算
  const [firstScore, secondScore] =
    firstStrategy.value === "cooperate"
      ? success
        ? [3, 7]
        : [1, 1]
      : success
      ? [1, 8]
      : [5, 2];

  if (firstPlayer.value === "A") {
    scores.value.A += firstScore;
    scores.value.B += secondScore;
  } else {
    scores.value.B += firstScore;
    scores.value.A += secondScore;
  }

  // 表向き処理
  revealed.value[selectedCard.value] = true;
  revealed.value[guessIdx] = true;
  if (!success) {
    // 失敗なら 2.5 秒後に裏返す
    setTimeout(() => {
      revealed.value[selectedCard.value] = false;
      revealed.value[guessIdx] = false;
    }, 2500);
  }

  // 結果保存
  lastResult.value = {
    strategy: firstStrategy.value,
    success,
    firstScore,
    secondScore,
  };
  phase.value = "result";

  // 次ラウンド or 終了
  setTimeout(() => {
    if (revealed.value.every((v) => v)) {
      phase.value = "gameOver";
    } else {
      // 先手交替
      firstPlayer.value = firstPlayer.value === "A" ? "B" : "A";
      resetRound();
    }
  }, 2500);
}

/* ---------- クラス計算 ---------- */
function cardClass(idx) {
  const cls = ["card"];
  if (revealed.value[idx]) cls.push("revealed");
  if (idx === selectedCard.value && phase.value === "choose")
    cls.push("selected");
  if (phase.value === "guess" && idx === hintIndex.value) cls.push("hint");
  return cls.join(" ");
}
function suitClass(s) {
  return s === "♥" || s === "♦" ? "card-heart" : "card-spade";
}
</script>

<style scoped>
/* -------------------------  スタイルはそのまま  ------------------------- */
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  font-family: "Helvetica Neue", Arial, sans-serif;
  background: #f5f5f5;
}
.title {
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 30px;
  color: #333;
}

.game-status {
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.round-info {
  font-size: 1.2rem;
  font-weight: 600;
}

.scores {
  display: flex;
  gap: 30px;
}

.score-a {
  color: #2563eb;
  font-weight: 600;
}

.score-b {
  color: #dc2626;
  font-weight: 600;
}

.phase-content {
  text-align: center;
}

.phase-title {
  font-size: 1.2rem;
  margin-bottom: 20px;
}

.phase-title.player-a {
  color: #2563eb;
}

.phase-title.player-b {
  color: #dc2626;
}

.strategy-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 15px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-success {
  background: #059669;
  color: white;
}

.btn-success:hover {
  background: #047857;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-large {
  padding: 15px 30px;
  font-size: 1.2rem;
}

.message-info {
  background: #f3f4f6;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 500;
}

.result-box {
  background: #f9fafb;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
}

.result-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.result-details {
  margin-bottom: 5px;
}

.result-scores {
  font-size: 0.9rem;
  color: #6b7280;
}

.cards-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  justify-items: center;
}

.card {
  width: 80px;
  height: 100px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: bold;
  font-size: 0.9rem;
}

.card.selectable:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.card.selected {
  border-color: #2563eb;
  background: #dbeafe;
}

.card.player-b-choice {
  border-color: #dc2626;
  background: #fee2e2;
}

.card.revealed {
  background: white;
}

.card.hidden {
  background: #4b5563;
  color: white;
}

.card-heart {
  color: #dc2626;
}

.card-spade {
  color: #000;
}

.card.hint {
  animation: blink 1s infinite alternate;
  border-color: #facc15;
}
@keyframes blink {
  from {
    box-shadow: 0 0 10px 5px rgba(250, 204, 21, 0.6);
  }
  to {
    box-shadow: 0 0 5px 2px rgba(250, 204, 21, 0.2);
  }
}

.rules {
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-top: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.rules-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 15px;
}

.rules-list {
  font-size: 0.9rem;
  color: #4b5563;
  line-height: 1.6;
}

.game-over {
  text-align: center;
}

.game-over-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 20px;
}

.game-over-winner {
  font-size: 1.2rem;
  margin-bottom: 30px;
}
</style>
