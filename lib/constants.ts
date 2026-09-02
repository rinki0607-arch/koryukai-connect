export const INDUSTRIES = [
  "IT・Web",
  "製造",
  "金融",
  "商社",
  "小売",
  "飲食",
  "医療・福祉",
  "教育",
  "不動産",
  "士業(法律・会計等)",
  "人材",
  "広告・マーケティング",
  "建設",
  "コンサルティング",
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
