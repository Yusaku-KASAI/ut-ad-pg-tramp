<template>
  <div class="container">
    <h1 class="title">神経衰弱 × 囚人のジレンマ</h1>
    
    <!-- ゲーム状態表示 -->
    <div class="game-status">
      <div class="status-header">
        <div class="round-info">
          ラウンド {{ currentRound }} / {{ maxRounds }}
        </div>
        <div class="scores">
          <div class="score-a">
            プレイヤーA: {{ scores.playerA }}点
          </div>
          <div class="score-b">
            プレイヤーB: {{ scores.playerB }}点
          </div>
        </div>
      </div>
      
      <!-- セットアップフェーズ -->
      <div v-if="gamePhase === 'setup'" class="phase-content">
        <button @click="startGame" class="btn btn-primary btn-large">
          ゲーム開始
        </button>
      </div>
      
      <!-- プレイヤーAのターン -->
      <div v-if="gamePhase === 'playerA'" class="phase-content">
        <p class="phase-title player-a">
          プレイヤーAのターン: カードを選択して戦略を決めてください
        </p>
        <div v-if="selectedCard !== null" class="strategy-buttons">
          <button @click="chooseStrategy('cooperate')" class="btn btn-success">
            協力（正しい情報）
          </button>
          <button @click="chooseStrategy('defect')" class="btn btn-danger">
            裏切り（嘘の情報）
          </button>
        </div>
      </div>
      
      <!-- プレイヤーBのターン -->
      <div v-if="gamePhase === 'playerB'" class="phase-content">
        <p class="phase-title player-b">
          プレイヤーBのターン: 情報を元にカードを選択してください
        </p>
        <div class="message-info">
          情報: {{ playerAMessage }}
        </div>
      </div>
      
      <!-- 結果表示 -->
      <div v-if="gamePhase === 'result' && roundResult" class="phase-content">
        <div class="result-box">
          <p class="result-title">
            ラウンド {{ roundResult.round }} 結果
          </p>
          <p class="result-details">
            プレイヤーAの戦略: {{ roundResult.playerAStrategy === 'cooperate' ? '協力' : '裏切り' }}
          </p>
          <p class="result-details">
            カード選択: {{ roundResult.isCorrectCard ? '正解' : '不正解' }}
          </p>
          <p class="result-details">
            判定: {{ roundResult.actualSuccess ? '成功' : '失敗' }}
          </p>
          <p class="result-scores">
            得点 - A: +{{ roundResult.playerAScore }}, B: +{{ roundResult.playerBScore }}
          </p>
        </div>
      </div>
      
      <!-- ゲーム終了 -->
      <div v-if="gamePhase === 'gameOver'" class="phase-content game-over">
        <h2 class="game-over-title">ゲーム終了!</h2>
        <p class="game-over-winner">
          {{ getWinner() }}
        </p>
        <button @click="startGame" class="btn btn-primary btn-large">
          新しいゲーム
        </button>
      </div>
    </div>
    
    <!-- カード表示 -->
    <div v-if="gamePhase !== 'setup' && gamePhase !== 'gameOver'" class="cards-container">
      <div class="cards-grid">
        <div 
          v-for="(card, index) in cards" 
          :key="index"
          :class="getCardClass(index)"
          @click="handleCardClick(index)"
        >
          <div v-if="revealedCards[index]" :class="getCardSuitClass(card.suit)">
            {{ card.suit }}{{ card.number }}
          </div>
          <div v-else class="card-back">
            ?
          </div>
        </div>
      </div>
    </div>
    
    <!-- ルール説明 -->
    <div class="rules">
      <h3 class="rules-title">ルール</h3>
      <div class="rules-list">
        <p>• プレイヤーAがカードを選択し、プレイヤーBに情報を提供</p>
        <p>• 協力時の成功確率: 70% / 裏切り時の成功確率: 30%</p>
        <p>• 得点: 協力成功(A:3, B:7) / 協力失敗(A:1, B:1) / 裏切り成功(A:1, B:8) / 裏切り失敗(A:5, B:2)</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'MemoryDilemmaGame',
  setup() {
    // カードの種類とスート
    const suits = ['♠', '♥', '♦', '♣']
    const numbers = [1, 2, 3, 4, 5]
    
    // ゲーム状態
    const cards = ref([])
    const gamePhase = ref('setup')
    const currentRound = ref(1)
    const maxRounds = ref(10)
    const scores = ref({ playerA: 0, playerB: 0 })
    const gameHistory = ref([])
    
    // ターン状態
    const selectedCard = ref(null)
    const playerAChoice = ref(null)
    const playerAMessage = ref('')
    const playerBChoice = ref(null)
    const roundResult = ref(null)
    const revealedCards = ref([])

    // カードデッキの初期化
    const initializeCards = () => {
      const deck = []
      suits.forEach(suit => {
        numbers.forEach(number => {
          deck.push({ suit: suit, number: number, id: suit + number })
        })
      })
      
      // シャッフル
      const shuffled = deck.slice().sort(() => Math.random() - 0.5)
      cards.value = shuffled
      revealedCards.value = new Array(20).fill(false)
    }

    // ゲーム開始
    const startGame = () => {
      initializeCards()
      gamePhase.value = 'playerA'
      currentRound.value = 1
      scores.value = { playerA: 0, playerB: 0 }
      gameHistory.value = []
      resetRound()
    }

    // ラウンドリセット
    const resetRound = () => {
      selectedCard.value = null
      playerAChoice.value = null
      playerAMessage.value = ''
      playerBChoice.value = null
      roundResult.value = null
    }

    // プレイヤーAのカード選択
    const selectCard = (index) => {
      if (gamePhase.value === 'playerA' && selectedCard.value === null) {
        selectedCard.value = index
      }
    }

    // プレイヤーAの戦略選択
    const chooseStrategy = (strategy) => {
      if (gamePhase.value === 'playerA' && selectedCard.value !== null) {
        playerAChoice.value = strategy
        
        // メッセージ生成
        const actualCard = cards.value[selectedCard.value]
        let message
        
        if (strategy === 'cooperate') {
          message = actualCard.suit + actualCard.number + 'は位置' + (selectedCard.value + 1) + 'にあります'
        } else {
          // 裏切り：嘘の情報を提供
          const fakePositions = Array.from({length: 20}, (_, i) => i).filter(i => i !== selectedCard.value)
          const fakePos = fakePositions[Math.floor(Math.random() * fakePositions.length)]
          message = actualCard.suit + actualCard.number + 'は位置' + (fakePos + 1) + 'にあります'
        }
        
        playerAMessage.value = message
        gamePhase.value = 'playerB'
      }
    }

    // プレイヤーBのカード選択
    const playerBSelectCard = (index) => {
      if (gamePhase.value === 'playerB' && playerBChoice.value === null) {
        playerBChoice.value = index
        
        // 成功判定
        const isSuccess = index === selectedCard.value
        const successProbability = playerAChoice.value === 'cooperate' ? 0.7 : 0.3
        const actualSuccess = isSuccess && Math.random() < successProbability
        
        // 得点計算
        let playerAScore, playerBScore
        if (actualSuccess) {
          playerAScore = playerAChoice.value === 'cooperate' ? 3 : 1
          playerBScore = playerAChoice.value === 'cooperate' ? 7 : 8
        } else {
          playerAScore = playerAChoice.value === 'cooperate' ? 1 : 5
          playerBScore = playerAChoice.value === 'cooperate' ? 1 : 2
        }
        
        // スコア更新
        scores.value.playerA += playerAScore
        scores.value.playerB += playerBScore
        
        // 結果保存
        const result = {
          round: currentRound.value,
          playerAStrategy: playerAChoice.value,
          actualCard: selectedCard.value,
          playerBChoice: index,
          isCorrectCard: isSuccess,
          actualSuccess,
          playerAScore,
          playerBScore,
          message: playerAMessage.value
        }
        
        roundResult.value = result
        gameHistory.value.push(result)
        
        // カードを一時的に表示
        const newRevealed = revealedCards.value.slice()
        newRevealed[selectedCard.value] = true
        newRevealed[index] = true
        revealedCards.value = newRevealed
        
        gamePhase.value = 'result'
        
        // 次のラウンドまたはゲーム終了
        setTimeout(() => {
          if (currentRound.value < maxRounds.value) {
            currentRound.value++
            gamePhase.value = 'playerA'
            resetRound()
            // カードを再び隠す
            revealedCards.value = new Array(20).fill(false)
          } else {
            gamePhase.value = 'gameOver'
          }
        }, 3000)
      }
    }

    // カードクリック処理
    const handleCardClick = (index) => {
      if (gamePhase.value === 'playerA') {
        selectCard(index)
      } else if (gamePhase.value === 'playerB') {
        playerBSelectCard(index)
      }
    }

    // カードのCSSクラス
    const getCardClass = (index) => {
      const classes = ['card']
      
      if (revealedCards.value[index]) {
        classes.push('revealed')
      } else {
        classes.push('hidden')
      }
      
      if (selectedCard.value === index) {
        classes.push('selected')
      }
      
      if (playerBChoice.value === index) {
        classes.push('player-b-choice')
      }
      
      if (gamePhase.value === 'playerA' && selectedCard.value === null) {
        classes.push('selectable')
      }
      
      if (gamePhase.value === 'playerB' && playerBChoice.value === null) {
        classes.push('selectable')
      }
      
      return classes.join(' ')
    }

    // カードスートのCSSクラス
    const getCardSuitClass = (suit) => {
      if (suit === '♥' || suit === '♦') {
        return 'card-heart'
      } else {
        return 'card-spade'
      }
    }

    // 勝者判定
    const getWinner = () => {
      if (scores.value.playerA > scores.value.playerB) {
        return 'プレイヤーAの勝利!'
      } else if (scores.value.playerB > scores.value.playerA) {
        return 'プレイヤーBの勝利!'
      } else {
        return '引き分け!'
      }
    }

    return {
      cards,
      gamePhase,
      currentRound,
      maxRounds,
      scores,
      gameHistory,
      selectedCard,
      playerAChoice,
      playerAMessage,
      playerBChoice,
      roundResult,
      revealedCards,
      startGame,
      chooseStrategy,
      handleCardClick,
      getCardClass,
      getCardSuitClass,
      getWinner
    }
  }
}
</script>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f5f5;
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
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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

.rules {
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-top: 30px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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