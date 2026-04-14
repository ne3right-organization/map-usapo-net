// Base map
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})
const googleMap = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
  maxZoom: 18,
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  attribution: '&copy; Google'
});
const japanBaseMap = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
})
const japanBasePhotoMap = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院 GRUS画像（© Axelspace）</a>'
})

const grayIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet/dist/images/marker-shadow.png",
  iconSize: [20, 32.8],
  popupAnchor: [1, -10],
  shadowSize: [32.8, 32.8],
  className: "icon-gray",
});

function getParamFromUrl(paramName) {
  const params = new URL(document.location.href).searchParams;
  return params.get(paramName);
}

function getCacheKey10min() {
  const now = new Date();
  const roundedMinutes = Math.floor(now.getMinutes() / 10) * 10;
  const key = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(roundedMinutes).padStart(2, '0')}`;
  return key;
}

async function getPostingData(pref_id = null, city_id = null, archive = null) {
  const cacheKey = getCacheKey10min();
  let url;
  const basePath = archive ? `conquer/${archive}` : "conquer";

  if (!pref_id) {
    // 全国データ
    url = `${CF_BASE_URL}/${basePath}/prefs.json?ts=${cacheKey}`;
  } else if (!city_id) {
    // 都道府県単位
    url = `${CF_BASE_URL}/${basePath}/pref${pref_id}.json?ts=${cacheKey}`;
  } else {
    // 市区町村単位
    url = `${CF_BASE_URL}/${basePath}/pref${pref_id}_city${city_id}.json?ts=${cacheKey}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch data from ${url}: ${response.status}`);
      return {};
    }
    return response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    return {};
  }
}

async function getMyFavPostingData(pref_id = null, city_id = null) {
  const cacheKey = getCacheKey10min();
  let url;

  if (!pref_id) {
    // 全国データ
    url = `${CF_BASE_URL}/myfav/prefs.json?ts=${cacheKey}`;
  } else if (!city_id) {
    // 都道府県単位
    url = `${CF_BASE_URL}/myfav/pref${pref_id}.json?ts=${cacheKey}`;
  } else {
    // 市区町村単位
    url = `${CF_BASE_URL}/myfav/pref${pref_id}_city${city_id}.json?ts=${cacheKey}`;
  }
  const response = await fetch(url);
  return response.json();
}

function transformByMemberNameWithAreaKeys(originalData) {
  const result = {};

  for (const areaId in originalData) {
    const area = originalData[areaId];
    const areaName = area.city || area.pref || area.address || '不明';
    const members = area.members;

    if (Array.isArray(members)) {
      members.forEach(member => {
        const name = member.name;
        const count = member.count;

        if (!result[name]) {
          result[name] = {};
        }

        result[name][areaId] = {
          area: areaName,
          count: count
        };
      });
    }
  }

  return result;
}

function areatotalBox(totalValue, position, isArchive = false) {
  var control = L.control({ position: position });
  control.onAdd = function () {

    var div = L.DomUtil.create('div', 'info progress')

    div.innerHTML += '<p>枚数 (全域)</p>'
    div.innerHTML += `<p><span class="progressValue">${totalValue}</span>枚</p>`

    return div;
  };

  return control
}

const milestones = [0, 100, 500, 1000, 5000]; //進捗枚数

const customCenterOverrides = {
  // 必要に応じて追加
  "東京都": { lat: 35.69384, lng: 139.70355 },
};