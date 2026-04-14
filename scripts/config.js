// s3 URL
const CF_BASE_URL = 'https://dbr7d89af0fox.cloudfront.net/data';

// アーカイブ設定（環境変数から注入）
// 注意: AVAILABLE_ARCHIVESは環境変数でJSON文字列として設定してください
// 例: [{"value":"2025summer","label":"2025 Summer"}]
const AVAILABLE_ARCHIVES = [{"value":"2025summer","label":"2025年夏"},{"value":"2026winter","label":"2026年冬"}];
const DEFAULT_ARCHIVE = '2026winter';
