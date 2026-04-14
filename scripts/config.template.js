// s3 URL
const CF_BASE_URL = '__CF_BASE_URL__';

// アーカイブ設定（環境変数から注入）
// 注意: AVAILABLE_ARCHIVESは環境変数でJSON文字列として設定してください
// 例: [{"value":"2025summer","label":"2025 Summer"}]
const AVAILABLE_ARCHIVES = __AVAILABLE_ARCHIVES__;
const DEFAULT_ARCHIVE = '__DEFAULT_ARCHIVE__';