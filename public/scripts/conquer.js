function legend(archiveTitle = null) {
  var control = L.control({ position: 'topright' });
  control.onAdd = function () {

    var div = L.DomUtil.create('div', 'info legend')
    grades = milestones.slice().reverse();

    div.innerHTML += `<p>${archiveTitle || '凡例'}</p>`;

    var legendInnerContainerDiv = L.DomUtil.create('div', 'legend-inner-container', div);
    legendInnerContainerDiv.innerHTML += '<div class="legend-gradient"></div>';

    var labelsDiv = L.DomUtil.create('div', 'legend-labels', legendInnerContainerDiv);
    for (var i = 0; i < grades.length; i++) {
      labelsDiv.innerHTML += '<span>' + grades[i] + '枚</span>';
    }
    return div;
  };

  return control
}

function archiveToggleControl(currentArchive) {
  var control = L.control({ position: 'topright' });
  control.onAdd = function () {
    // アーカイブモードかどうかチェック
    const isArchiveMode = !!currentArchive;

    // アーカイブモード時にクラスを追加
    const className = isArchiveMode ? 'archive-toggle-control archive-mode' : 'archive-toggle-control';
    var div = L.DomUtil.create('div', className);

    // 利用可能なアーカイブのリスト（環境変数またはデフォルト値から取得）
    const availableArchives = typeof AVAILABLE_ARCHIVES !== 'undefined' ? AVAILABLE_ARCHIVES : [];

    // トグルスイッチとドロップダウンのHTML
    div.innerHTML = `
      <div class="archive-toggle-container">
        <label class="toggle-switch">
        <input type="checkbox" id="GPS" onclick="onGPS(this)">
        <span class="toggle-slider"></span>
        </label>
        <span class="toggle-text" id="gpsLabel">📍現在地</span>
      </div>
      <br>
      <div class="archive-toggle-container">
        <label class="toggle-switch">
        <input type="checkbox" id="tapAddressSearch" onclick="onToggleTapAddressSearch(this)">
        <span class="toggle-slider"></span>
        </label>
        <span class="toggle-text">🔍タップして住所検索</span>
      </div>
      <br>
      <div class="archive-toggle-container">
        <label class="toggle-switch">
          <input type="checkbox" id="archiveToggle" ${isArchiveMode ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <div class="toggle-label">
          ${isArchiveMode ?
        `<select id="archiveSelect" class="archive-select">
              ${availableArchives.map(arch =>
          `<option value="${arch.value}" ${currentArchive === arch.value ? 'selected' : ''}>${arch.label}</option>`
        ).join('')}
            </select>` :
        '<span class="toggle-text">📖現在のデータ</span>'
      }
        </div>
      </div>
    `;

    // イベントリスナーを追加
    L.DomEvent.disableClickPropagation(div);

    const checkbox = div.querySelector('#archiveToggle');
    const select = div.querySelector('#archiveSelect');

    // チェックボックスの変更イベント
    checkbox.addEventListener('change', function (e) {
      const currentUrl = new URL(window.location.href);

      if (e.target.checked) {
        // アーカイブモードに切り替え（デフォルトアーカイブを選択）
        let defaultArchive;
        if (typeof DEFAULT_ARCHIVE !== 'undefined' && DEFAULT_ARCHIVE !== '') {
          defaultArchive = DEFAULT_ARCHIVE;
        } else if (availableArchives.length > 0) {
          defaultArchive = availableArchives[0].value;
        } else {
          defaultArchive = '';
        }
        if (defaultArchive) {
          currentUrl.searchParams.set('archive', defaultArchive);
        }
      } else {
        // 現在のデータモードに切り替え
        currentUrl.searchParams.delete('archive');
      }

      window.location.href = currentUrl.toString();
    });

    // ドロップダウンの変更イベント（アーカイブモード時のみ）
    if (select) {
      select.addEventListener('change', function (e) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('archive', e.target.value);
        window.location.href = currentUrl.toString();
      });
    }

    return div;
  };

  return control;
}

function getProgressColor(value) {
  const blueStart = { r: 128, g: 224, b: 255 }; // 明るい青
  const blueEnd = { r: 0, g: 0, b: 255 };       // 濃い青

  let lower = milestones[0];
  let upper = milestones[milestones.length - 1];

  let index = 0;
  for (let i = 1; i < milestones.length; i++) {
    if (value < milestones[i]) {
      lower = milestones[i - 1];
      upper = milestones[i];
      index = i - 1;
      break;
    }
    index = i - 1;
  }

  const localPct = (value - lower) / (upper - lower);
  const globalPct = (index + localPct) / (milestones.length - 1); // 全体での位置

  const r = Math.round(blueStart.r + globalPct * (blueEnd.r - blueStart.r));
  const g = Math.round(blueStart.g + globalPct * (blueEnd.g - blueStart.g));
  const b = Math.round(blueStart.b + globalPct * (blueEnd.b - blueStart.b));

  return `rgb(${r}, ${g}, ${b})`;
}

function getGeoJsonStyle(value) {
  return {
    color: 'black',
    fillColor: getProgressColor(value),
    fillOpacity: 0.7,
    weight: 2,
  }
}

function setPolygonPopup(polygon, areaname, value, records) {
  let popupContent = `<b>${areaname}</b><br>`;
  popupContent += `トータル: ${value}枚<br>`;

  // ▼ 日別データがあれば追加（降順）
  if (records && records.length > 0) {
    // 日付降順でソート
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    popupContent += `<hr><table style="font-size: 12px;">`;
    popupContent += `<tr><th style="text-align:left;">日付</th><th style="text-align:right;">枚数</th></tr>`;
    records.forEach(r => {
      popupContent += `<tr><td>${r.date}</td><td style="text-align:right;">${r.count}</td></tr>`;
    });
    popupContent += `</table>`;
  }

  polygon.bindPopup(popupContent);

  // ▼ 一定値以上ならアイコンをマップ上に表示
  if (value < 50) return;
  const center = polygon.getBounds().getCenter();

  const iconThresholds = [
    { threshold: 2000, image: './usagi_2000.png' },
    { threshold: 1000, image: './usagi_1000.png' },
    { threshold: 800, image: './usagi_800.png' },
    { threshold: 500, image: './usagi_500.png' },
    { threshold: 100, image: './usagi_100.png' },
    { threshold: 50, image: './usagi_100.png' },
  ];

  const { image } = iconThresholds.find(t => value >= t.threshold);

  const icon = L.icon({
    iconUrl: image,
    iconSize: [100, 100],
    iconAnchor: [50, 50],
  });

  L.marker([center.lat, center.lng], { icon: icon }).addTo(map);
}

function loadMapByArea(data, area_name = null, pref_id = null, city_id = null) {
  for (let key in data) {
    const item = data[key];

    // パラメータによって処理を分岐
    let geoJsonUrl = '';
    let cpref = '';
    let ccity = '';
    let label = '';
    let subarea = '';
    let value = 0;
    let is_detail = false
    let records = [];

    if (pref_id === null && city_id === null) {
      // 全国表示
      subarea = item.pref;
      cpref = key;
      label = item.pref;
      value = item.sum;
    } else if (pref_id !== null && city_id === null) {
      // 都道府県表示
      subarea = `${area_name}${item.city}`;
      cpref = pref_id;
      ccity = key;
      label = item.city;
      value = item.sum;
    } else if (pref_id !== null && city_id !== null) {
      // 市区町村詳細
      subarea = `${area_name}${item.address}`;
      label = item.address;
      value = item.sum;
      records = item.records || [];
      is_detail = true
    }
    geoJsonUrl = `https://uedayou.net/loa/${subarea}.geojson`;

    fetch(geoJsonUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch geojson for ${label}`);
        }
        return response.json();
      })
      .then((geoData) => {
        const polygon = L.geoJSON(geoData, { style: getGeoJsonStyle(value) });
        polygon.addTo(map);

        const centroid = polygon.getBounds().getCenter();
        if (!is_detail) {
          setMarkerWithTooltip(polygon, subarea, cpref, ccity, label, value);
        } else {
          setPolygonPopup(polygon, subarea, value, records);
        }
      })
      .catch((error) => {
        console.error('Error fetching geojson:', error);
      });
  }
}

function setMarkerWithTooltip(polygon, area_name, pref_id, city_id, label, value) { //全体マップの描画
  let center = polygon.getBounds().getCenter();
  if (customCenterOverrides[area_name]) {
    center = customCenterOverrides[area_name];
  }

  const marker = L.marker([center.lat, center.lng]).addTo(map);

  const tooltipContent = `
  <div style="text-align: center;">
    <strong>${label}</strong><br>
    <span style="font-size: 12px; color: gray;"> ${value} 枚</span>
  </div>
`;

  marker.bindTooltip(tooltipContent, {
    permanent: true,
    direction: 'bottom',
    offset: [-15, 40],
    className: "custom-tooltip"
  }).openTooltip();

  marker.on('click', function () {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('area_name', area_name);
    currentUrl.searchParams.set('pref_id', pref_id);
    currentUrl.searchParams.set('city_id', city_id);
    currentUrl.searchParams.set('lat', center.lat);
    currentUrl.searchParams.set('lng', center.lng);
    window.location.href = currentUrl.toString();
  });
}

var map = L.map("map", { preferCanvas: true, zoomControl: false }).setView([35.669400214188606, 139.48343915372877], 11);

const baseLayers = {
  'OpenStreetMap': osm,
  'Google Map': googleMap,
  '全国最新写真': japanBasePhotoMap,
  '国土地理院地図': japanBaseMap,
};

japanBaseMap.addTo(map);
let layerControl = L.control.layers(baseLayers, null, { position: "topleft" }).addTo(map);

let areaList;
let progress;

const area_name = getParamFromUrl("area_name");
const pref_id = getParamFromUrl("pref_id");
const city_id = getParamFromUrl("city_id");
const lat = getParamFromUrl("lat");
const lng = getParamFromUrl("lng");
const archive = getParamFromUrl("archive");
const archiveLabel = archive ? `${archive} の実績` : null;
const isArchive = !!archive;

Promise.all([getPostingData(pref_id, city_id, archive)]).then(function (res) {
  postingdata = res[0];

  // データが空の場合の処理
  if (!postingdata || Object.keys(postingdata).length === 0) {
    console.warn(`No data found for archive: ${archive}`);
  }

  const total = Object.values(postingdata).reduce((acc, item) => acc + (item.sum || 0), 0);

  if (pref_id === null) {
    // 全国
    loadMapByArea(postingdata);
  } else if (pref_id !== null && (city_id === null || city_id === "")) {
    // 都道府県マップ
    map.setView([lat, lng], 11);
    loadMapByArea(postingdata, area_name, pref_id, null);
  } else if (pref_id !== null && city_id !== null) {
    // 市区町村マップ
    map.setView([lat, lng], 14);
    loadMapByArea(postingdata, area_name, pref_id, city_id);
  }

  //マップ合計と凡例を表示
  areatotalBox(total, 'topright', isArchive).addTo(map)
  legend(archiveLabel).addTo(map);

  // アーカイブ切り替えコントロールを追加
  archiveToggleControl(archive).addTo(map);

}).catch((error) => {
  console.error('Error in fetching data:', error);
});

// https://zenn.dev/uedayou/articles/272704196e41b2#%E3%82%B8%E3%82%AA%E3%83%8F%E3%83%83%E3%82%B7%E3%83%A5%E5%80%A4%3Axn76u(%E6%9D%B1%E4%BA%AC%E9%A7%85%E3%81%AE%E5%91%A8%E8%BE%BA)%E3%81%AB%E5%90%AB%E3%81%BE%E3%82%8C%E3%82%8B%E4%BD%8F%E6%89%80
async function geoHashQuery(geohashes) {
  const query = `
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX dcterms: <http://purl.org/dc/terms/>
  PREFIX schema: <http://schema.org/>
  PREFIX ic: <http://imi.go.jp/ns/core/rdf#>
  PREFIX geonames: <http://www.geonames.org/ontology#>
  PREFIX loa: <https://uedayou.net/loa/>

  SELECT ?uri ?geohash WHERE {
    {
      ?uri rdfs:label ?address;
          schema:geo ?geohash.
    } UNION {
      ?s rdfs:label ?address;
        dcterms:hasPart ?n.
      ?n schema:geo ?geohash;
        ic:丁目 ?cho.
      BIND (URI(CONCAT(str(?s), str(?cho), "丁目")) AS ?uri)
    }
    FILTER(regex(str(?geohash), '^http://geohash.org/(${geohashes.join("|")})'))
  }
  limit 1024
  `;
  const url = "https://uedayou.net/loa/sparql?query=" + encodeURIComponent(query);
  const headers = { "Accept": "application/sparql-results+json" };

  const response = await fetch(url, { headers });
  const data = await response.json();
  
  return data.results.bindings;
}

function commonPrefixCount(a, b) {
  let len = Math.min(a.length, b.length);
  let i = 0
  for (; i < len; i++) {
    if(a[i] !== b[i])
    {
      break;
    }
  }
  return i;
}

// 重複してマップに追加しない
let existingPolygons = {};

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

const WKT_KEY = "http://www.opengis.net/ont/geosparql#asWKT";

// 以下の座標での緯度・経度メートル換算 近似的な距離計算用
// lat: 35.68475125743868
// lng: 139.7542476654053
const LAT_TO_METER = 110962.438;
const LNG_TO_METER = 90520.776;

const APPROX_SEARCH_RADIUS = 1000; // in meter

function getJsonMainKey(geoData)
{
  return Object.keys(geoData).filter(s => s.startsWith("https://uedayou.net/loa/")).toSorted()[0];
}
function addressCanLikelyGoDownTo(x)
{
  if( Number(x.match(/\d{1,5}$/)?.[0] ?? 0) <= 42 == false ) // 最後の数字が大きい住所はたいてい不要
  {
    return false;
  }
  return true;
}

function buildPopupContent(address)
{
  return `<div>${address}</div><a id="copyLabel" href="javascript:navigator.clipboard.writeText(['ぴょん活報告', '${address}', '100', 'コメント'].join('\\n')).then(() => document.getElementById('copyLabel').innerText = 'コピーしました');">コピーする</a>`;
}
async function processGeoElements( geoElements, latlng )
{
  let isFirst = true;

  geoElements.reverse();
  while(geoElements.length)
  {
    const geoElement = geoElements.pop();
    const address = geoElement.uri.split('/').pop();
    const jsonUrl = geoElement.uri + '.json';

    let geoData = null;
    try
    {
      const response = await fetch(jsonUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      geoData = await response.json();
    } catch (e) {
      console.log(e);
      continue;
    }
    
    const objKey = getJsonMainKey(geoData);
    const objAttrib = geoData[objKey];
    const parts = objAttrib["http://purl.org/dc/terms/hasPart"];
    const WKTs = objAttrib[WKT_KEY];

    if( WKTs === undefined || WKTs.length == 0 )
    {
      // console.log("no data " + address);
      continue; // skip
    }
    const WKT = WKTs[0].value;
    const geoJson = wellknown.parse(WKT);

    let chome = objAttrib["http://imi.go.jp/ns/core/rdf#丁目"] ?? null;

    // さらに下降可能かを調べる
    let skipTraverse = false;
    if(chome) // 丁目がある場合は即座に末端と判断し調査しない
    {
      skipTraverse = true;
    }

    if( skipTraverse == false && parts !== undefined && parts.length )
    {
      if(addressCanLikelyGoDownTo(parts[0].value)) // 完璧ではないが、一つ目があり得なさそうならスキップ
      {
        const response = await fetch(parts[0].value + ".json");
        const child = await response.json();
  
        const childKey = getJsonMainKey(child);
        const childAttrib = child[childKey];
        if( WKT_KEY in childAttrib )
        {
          const childWKT = childAttrib[WKT_KEY][0].value;
          if( childWKT !== WKT ) // データエラー。親とジオメトリが同じような住所は下りない
          {
            for (const p of parts) 
            {
              if(addressCanLikelyGoDownTo(p.value))
              {
                  geoElements.push({ uri: p.value });
              }
            }
          }
  
          continue;
        }
      }
    }
    
    // console.log(address);

    if( WKT in existingPolygons )
    {
      // 同じところにまとめて表示
      const currentPopup = existingPolygons[WKT].getPopup();
      const currentAddress = currentPopup.userdata_address;
      const commonCount = commonPrefixCount(currentAddress, address);
      const commonAddress = address.substr(0, commonCount);
      currentPopup.setContent(buildPopupContent(commonAddress));
      currentPopup.userdata_address = commonAddress;
    }
    else
    {
      const colors = ["aqua","blue","fuchsia","green","lime","maroon","navy","olive","purple","red","teal","yellow"];
      const polygon = L.geoJSON(geoJson, { 
        style: {
          color: colors[getRandomInt(colors.length)],
          fillOpacity: 0.2
        } 
      });

      polygon.addTo(map);
      polygon.bindPopup(buildPopupContent(address));
      polygon.getPopup().userdata_address = address;
      if(isFirst) // 一つ目は最近傍の住所であり、探しているものである可能性が高いので表示
      {
        polygon.openPopup();
        isFirst = false;
      }
      existingPolygons[WKT] = polygon;
    }
  }
}

// あまり連続でクエリしすぎないように制御
let isSearching = false;
let searchCircle = null;

function onMapClick(e) {
  const checkbox = document.getElementById('tapAddressSearch');
  if (!checkbox.checked) {
    return;
  }

  if(isSearching)
  {
    return;
  }

  // console.log(e.latlng);
  
  // debug
  // e.latlng.lat = 38.18098951438852;
  // e.latlng.lng = 140.86738586425784;
  // e.latlng.lat = 38.26163684287986;
  // e.latlng.lng = 140.95587730407718;

  isSearching = true;

  let popup = L.popup();
  popup
      .setLatLng(e.latlng)
      .setContent("住所検索中...")
      .openOn(map);
  
  // const geohash = encodeGeoHash(e.latlng.lat, e.latlng.lng);

  let geohashes = new Set();
  const offsetScale = 0.9;
  for(let y = -1 ; y <= 1 ; y += 2)
  for(let x = -1 ; x <= 1 ; x += 2)
  {
    const qLat = e.latlng.lat + offsetScale * APPROX_SEARCH_RADIUS / LAT_TO_METER * y;
    const qLng = e.latlng.lng + offsetScale * APPROX_SEARCH_RADIUS / LNG_TO_METER * x;
    const geohash = encodeGeoHash(qLat, qLng);
    geohashes.add(geohash.slice(0, 5));
    // L.marker([qLat, qLng]).addTo(map);
  }
  geohashes = Array.from(geohashes);

  // console.log(Array.from(geohashes).join("|"));
  
  //test 
  // console.log(geohash.slice(0, 5));
  // isSearching = false;
  // return;
  if(searchCircle)
  {
    searchCircle.remove();
  }
  searchCircle = L.circle([e.latlng.lat, e.latlng.lng], {radius: APPROX_SEARCH_RADIUS}).addTo(map);

  geoHashQuery(geohashes).then(elements => {
    const relaxScale = 1.5;
    let geoElements = [];
    for (let i = 0; i < elements.length; i++) {
      const thisGeoHash = elements[i].geohash.value.split('/').pop();
      const decoded = decodeGeoHash(thisGeoHash);
      
      const objLNG = decoded.longitude[2];
      const objLAT = decoded.latitude[2];
      const dy = ( objLAT - e.latlng.lat ) * LAT_TO_METER;
      const dx = ( objLNG - e.latlng.lng ) * LNG_TO_METER;
      const distanceSquared = dx * dx + dy * dy;

      if( distanceSquared < APPROX_SEARCH_RADIUS * APPROX_SEARCH_RADIUS * relaxScale * relaxScale )
      {
        geoElements.push({ distanceSquared: distanceSquared, uri: elements[i].uri.value });
      }
    }
    
    if( geoElements.length == 0 )
    {
      return;
    }

    geoElements.sort( (a, b) => a.distanceSquared - b.distanceSquared );

    // for (let i = 0; i < geoElements.length; i++) {
    //   console.log(`${geoElements[i].uri}`);
    // }
    // console.log("--");

    return processGeoElements(geoElements, e.latlng);
  }).catch( e => {
      console.log(e); // something wrong...
  })
  .finally(() => {
    map.closePopup(popup);
    searchCircle.remove();
    searchCircle = null;
    isSearching = false;
  });
}

map.on('click', onMapClick);

let persistentObjects = new Set();
let layerBackup = [];
function onToggleTapAddressSearch(checkbox)
{
  if(checkbox.checked)
  {
    map.eachLayer(function(layer) {
      if( persistentObjects.has(layer) )
      {
        return;
      }

      if (layer instanceof L.Polygon || layer instanceof L.Marker) {
        layer.remove();
        layerBackup.push(layer);
      }
    });
  }
  else
  {
    for(let i = 0 ; i < layerBackup.length ; i++)
    {
      layerBackup[i].addTo(map);
    }
    layerBackup = [];

    for (const key in existingPolygons) { 
      existingPolygons[key].remove();
    }
    existingPolygons = {};
  }
}

let gpsMarker = null;
let gpsCircle = null;
let gpsCircleMarker = null;
let watchID = null;
function onGPS(checkbox)
{
  const labelText = "📍現在地";
  const label = document.getElementById("gpsLabel");
  if(checkbox.checked)
  {
    label.textContent = labelText + "(取得中...)";

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0
    };
    watchID = navigator.geolocation.watchPosition((position) => {
      if( gpsMarker === null)
      {
        label.textContent = labelText;

        map.setView([position.coords.latitude, position.coords.longitude], 14);
        // L.marker([position.coords.latitude, position.coords.longitude]).addTo(map);
    
        const icon = L.icon({
          iconUrl: './run.gif',
          iconSize:     [128, 179],
          iconAnchor:   [62, 178], 
          popupAnchor: [0, -120]
        });
        gpsMarker = L.marker([position.coords.latitude, position.coords.longitude], {icon: icon}).addTo(map).bindPopup("現在地");

        gpsCircle = L.circle([position.coords.latitude, position.coords.longitude], {
            color: 'blue',
            fillColor: 'rgba(0, 102, 255, 1)',
            fillOpacity: 0.2,
            radius: position.coords.accuracy
        }).addTo(map);

        gpsCircleMarker = L.circleMarker([position.coords.latitude, position.coords.longitude], {
          radius: 10,     
          color: "white",
          fillColor: 'rgba(0, 102, 255, 1)',
          fillOpacity: 1,
          weight: 2
        }).addTo(map);
      }
      gpsMarker.setLatLng([position.coords.latitude, position.coords.longitude])
      gpsCircle.setRadius(position.coords.accuracy);
      gpsCircle.setLatLng([position.coords.latitude, position.coords.longitude])
      gpsCircleMarker.setLatLng([position.coords.latitude, position.coords.longitude])

      persistentObjects.add(gpsMarker);
      persistentObjects.add(gpsCircle);
      persistentObjects.add(gpsCircleMarker);
    }, (e) => {
      console.log(e);
      if(e.code == 1)
      {
        alert("位置情報取得が許可されませんでした。設定を変更してください。");
      }
    }, options);
  }
  else
  {
    label.textContent = labelText;
    persistentObjects.delete(gpsMarker);
    persistentObjects.delete(gpsCircle);
    persistentObjects.delete(gpsCircleMarker);
    navigator.geolocation.clearWatch(watchID)
    gpsMarker.remove();
    gpsMarker = null;
    gpsCircle.remove();
    gpsCircleMarker.remove();
  }
}