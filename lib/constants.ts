export const INDUSTRIES = [
  "IT・ソフトウェア開発",
  "Web・インターネットサービス",
  "通信・情報通信",
  "製造(電子機器・精密機器)",
  "製造(機械・産業機器)",
  "製造(食品)",
  "製造(その他)",
  "建設・住宅",
  "不動産",
  "卸売・商社",
  "小売",
  "飲食・フード",
  "宿泊・観光",
  "運輸・物流",
  "金融(銀行・証券)",
  "保険",
  "会計・税務(士業)",
  "法律(士業)",
  "コンサルティング",
  "人材・採用",
  "広告・マーケティング",
  "メディア・出版",
  "エンタメ・イベント",
  "教育・研修",
  "医療",
  "介護・福祉",
  "美容・健康",
  "農業・漁業",
  "エネルギー・環境",
  "官公庁・団体",
  "その他",
];

export const JOB_TYPES = [
  "経営者・役員",
  "営業",
  "マーケティング・広報",
  "企画・事業開発",
  "エンジニア・技術職",
  "研究開発",
  "生産・製造",
  "人事・総務",
  "経理・財務",
  "士業(専門職)",
  "医療専門職",
  "クリエイティブ・デザイン",
  "カスタマーサポート",
  "その他",
];

export const CONNECT_TAGS = [
  "資金調達",
  "業務提携",
  "採用・転職",
  "顧客紹介",
  "情報交換",
  "メンター探し",
  "異業種交流",
  "その他",
];

export function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function formatMonthLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

export function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
