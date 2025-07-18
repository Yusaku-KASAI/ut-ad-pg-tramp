<script setup>
import { onMounted, onUnmounted, ref, reactive } from "vue";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css"; // ← 未導入の場合は追加

const el = ref(null);

const state = reactive({
  viewer: /** @type {Cesium.Viewer|null} */ (null),
  player: /** @type {Cesium.Entity|null} */ (null),
  activeIdx: null, // 距離で発見したポイント
  modalIdx: null, // ヒントを開いたインデックス
  points: [
    {
      name: "横浜ランドマークタワー",
      lon: 139.631,
      lat: 35.4544,
      riddle: "地上296mの展望台がある高層ビルは？",
      solved: false,
    },
    {
      name: "コスモクロック21",
      lon: 139.639,
      lat: 35.4541,
      riddle: "観覧車に時を刻む時計の名は？",
      solved: false,
    },
    {
      name: "カップヌードルミュージアム",
      lon: 139.6361,
      lat: 35.4553,
      riddle: "インスタントラーメンの聖地は？",
      solved: false,
    },
    {
      name: "横浜赤レンガ倉庫",
      lon: 139.6401,
      lat: 35.4488,
      riddle: "明治の倉庫を活かした商業施設は？",
      solved: false,
    },
    {
      name: "横浜ハンマーヘッド",
      lon: 139.6398,
      lat: 35.4559,
      riddle: "新港ふ頭客船ターミナルの俗称は？",
      solved: false,
    },
  ],
});

/* ─────────────────────────────────────────
   1. 初期化
   ───────────────────────────────────────── */
onMounted(async () => {
  /* Cesium Ion トークンを設定（.env 優先） */
  Cesium.Ion.defaultAccessToken =
    import.meta.env.VITE_CESIUM_ION_TOKEN ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNjk0MTM4NC1lMWI0LTQxNTgtYjcxZS01ZWJhMGJlMTE1MWQiLCJpZCI6MTQ5ODk3LCJpYXQiOjE3MTUxNTEyODZ9.2aUmEQ2-fDsjf-XeC6-hZpwkgwLse3yXoXF4xTOvPAY";

  /* Viewer ─ 平坦化オプションで地中に埋まらないように */
  const viewer = new Cesium.Viewer(el.value, {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    timeline: false,
    animation: false,
    selectionIndicator: false,
    infoBox: false,
  });
  state.viewer = viewer;

  /* 航空写真レイヤー */
  viewer.scene.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: "https://api.plateauview.mlit.go.jp/tiles/plateau-ortho-2023/{z}/{x}/{y}.png",
      maximumLevel: 19,
    })
  );

  /* 3D Tiles（みなとみらい低解像度モデル） */
  const tileset = await Cesium.Cesium3DTileset.fromUrl(
    "https://plateau.geospatial.jp/main/data/3d-tiles/bldg/14100_yokohama/low_resolution/tileset.json"
  );
  viewer.scene.primitives.add(tileset);
  await tileset.readyPromise;

  /* 球体プレイヤー（高さ 50 m から開始） */
  const player = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(139.6315, 35.4546, 50),
    ellipsoid: {
      radii: new Cesium.Cartesian3(10, 10, 10),
      material: Cesium.Color.ORANGE,
    },
    viewFrom: new Cesium.Cartesian3(-80, -80, 40),
  });
  viewer.trackedEntity = player;
  state.player = player;

  /* 俯瞰ビューでスタート */
  viewer.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), 120)
  );

  /* ─────────── キーボード入力 ─────────── */
  const keys = { f: false, b: false, l: false, r: false };
  const keyDown = (e) => {
    if (e.repeat) return;
    if (e.key === "w" || e.key === "ArrowUp") keys.f = true;
    if (e.key === "s" || e.key === "ArrowDown") keys.b = true;
    if (e.key === "a" || e.key === "ArrowLeft") keys.l = true;
    if (e.key === "d" || e.key === "ArrowRight") keys.r = true;
  };
  const keyUp = (e) => {
    if (e.key === "w" || e.key === "ArrowUp") keys.f = false;
    if (e.key === "s" || e.key === "ArrowDown") keys.b = false;
    if (e.key === "a" || e.key === "ArrowLeft") keys.l = false;
    if (e.key === "d" || e.key === "ArrowRight") keys.r = false;
  };
  document.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUp);

  /* Esc キーでモーダル閉じる */
  const escClose = (e) => {
    if (e.key === "Escape") state.modalIdx = null;
  };
  document.addEventListener("keydown", escClose);

  /* ─────────── 移動 & 当たり判定 ─────────── */
  const stepMps = 6; // 6 m/s（徒歩）
  let lastTime = Cesium.JulianDate.now();

  viewer.clock.onTick.addEventListener(() => {
    const now = Cesium.JulianDate.now();
    const dt = Cesium.JulianDate.secondsDifference(now, lastTime);
    lastTime = now;

    /* A. 移動処理 ---------------------------------------------------- */
    if (keys.f || keys.b || keys.l || keys.r) {
      const carto = Cesium.Cartographic.fromCartesian(
        player.position.getValue(now)
      );
      let { latitude: lat, longitude: lon, height: h } = carto;

      const metersToRadLat = (stepMps / 6378137) * dt; // 地球半径
      const metersToRadLon = metersToRadLat / Math.cos(lat);

      if (keys.f) lat += metersToRadLat;
      if (keys.b) lat -= metersToRadLat;
      if (keys.l) lon -= metersToRadLon;
      if (keys.r) lon += metersToRadLon;

      player.position.setValue(Cesium.Cartesian3.fromRadians(lon, lat, h));
    }

    /* B. 当たり判定 -------------------------------------------------- */
    const p = Cesium.Cartographic.fromCartesian(player.position.getValue(now));
    const pLon = Cesium.Math.toDegrees(p.longitude);
    const pLat = Cesium.Math.toDegrees(p.latitude);
    state.activeIdx = null;

    state.points.forEach((pt, i) => {
      if (pt.solved) return;
      const dist = Cesium.Cartesian3.distance(
        Cesium.Cartesian3.fromDegrees(pLon, pLat),
        Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat)
      );
      if (dist < 30) {
        // 30 m 以内で発見
        pt.solved = true;
        state.activeIdx = i;
      }
    });
  });

  /* ─────────── 後片付け ─────────── */
  onUnmounted(() => {
    document.removeEventListener("keydown", keyDown);
    document.removeEventListener("keyup", keyUp);
    document.removeEventListener("keydown", escClose);
    viewer.destroy();
  });
});
</script>

<template>
  <!-- ⛰️ Cesium 画面 -->
  <div ref="el" class="screen" />

  <!-- 📌 発見モーダル -->
  <transition name="fade">
    <div v-if="state.activeIdx !== null" class="card">
      <h2>{{ state.points[state.activeIdx].name }} を発見！</h2>
      <p>{{ state.points[state.activeIdx].riddle }}</p>
      <button @click="state.activeIdx = null">閉じる</button>
    </div>
  </transition>

  <!-- 🔍 ヒント & 進捗 -->
  <div class="hint-box">
    <p class="hint-title">みなとみらい探索</p>
    <ul>
      <li
        v-for="(p, i) in state.points"
        :key="p.name"
        @click="state.modalIdx = i"
        :class="{ solved: p.solved }"
      >
        {{ p.solved ? p.name + " ✓" : "ヒント" + (i + 1) }}
      </li>
    </ul>
  </div>

  <!-- 💡 ヒントモーダル（クリックで表示） -->
  <transition name="fade">
    <div v-if="state.modalIdx !== null" class="modal">
      <div class="modal-content">
        <button class="close" @click="state.modalIdx = null">×</button>
        <h2>{{ state.points[state.modalIdx].solved ? "答え" : "ヒント" }}</h2>
        <p>
          {{
            state.points[state.modalIdx].solved
              ? state.points[state.modalIdx].name
              : state.points[state.modalIdx].riddle
          }}
        </p>
      </div>
    </div>
  </transition>

  <!-- 🎉 コンプリートバナー -->
  <transition name="fade">
    <div v-if="state.points.every((pt) => pt.solved)" class="clear-banner">
      <h1>コンプリート！</h1>
      <p>全スポットを発見しました 🎉</p>
    </div>
  </transition>
</template>

<style scoped>
/* ─────────── 画面全体 ─────────── */
.screen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}

/* ─────────── 発見カード ─────────── */
.card {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  max-width: 300px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  padding: 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.card h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 700;
}
.card p {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  line-height: 1.4;
}
.card button {
  padding: 0.25rem 0.75rem;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 0.35rem;
  cursor: pointer;
}

/* ─────────── フェードアニメ ─────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ─────────── ヒントボックス ─────────── */
.hint-box {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  line-height: 1.4;
  max-width: 220px;
}
.hint-title {
  margin: 0 0 0.25rem;
  font-weight: 700;
}
.hint-box ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.hint-box li {
  cursor: pointer;
  margin: 0.2rem 0;
  text-decoration: underline;
}
.hint-box li:hover {
  color: #ffd54f;
}
.hint-box li.solved {
  text-decoration: none;
  color: #a5f3fc;
}

/* ─────────── モーダル ─────────── */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal-content {
  background: #fff;
  padding: 1.5rem 2rem;
  border-radius: 0.75rem;
  max-width: 320px;
  width: 90%;
  position: relative;
}
.modal-content h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
}
.modal-content p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}
.close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  border: none;
  background: none;
  font-size: 1.25rem;
  cursor: pointer;
}

/* ─────────── コンプリートバナー ─────────── */
.clear-banner {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  z-index: 60;
}
.clear-banner h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem;
}
.clear-banner p {
  margin: 0;
  font-size: 1rem;
}
</style>
