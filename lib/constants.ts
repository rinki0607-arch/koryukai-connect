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

// 機能5: 投資家・メンターマッチング特化カテゴリ
export const MEMBER_CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "general", label: "一般参加者", emoji: "🙂" },
  { value: "founder", label: "起業家", emoji: "🚀" },
  { value: "investor", label: "投資家", emoji: "💰" },
  { value: "mentor", label: "メンター", emoji: "🎓" },
];

export function memberCategoryLabel(value: string | null | undefined): string {
  return MEMBER_CATEGORIES.find((c) => c.value === value)?.label || "一般参加者";
}

export function memberCategoryEmoji(value: string | null | undefined): string {
  return MEMBER_CATEGORIES.find((c) => c.value === value)?.emoji || "🙂";
}

export const FUNDING_STAGES = [
  "アイデア・構想段階",
  "プレシード",
  "シード",
  "シリーズA",
  "シリーズB以降",
  "資金調達予定なし",
];

// 機能4: 人脈資本スコア・コミュニティランキングのティアに応じた色分け
// プラチナ(最上位)だけは「メイン(コーラル)」ではなく、ゴールドのグラデーションで
// 特別感を出す(コーラルはCTA・いいね専用に役割を絞るため)。
export const CAPITAL_TIER_STYLES: Record<string, string> = {
  "ブロンズ": "bg-[#f0e4da] text-[#7a4a23]",
  "シルバー": "bg-gray-200 text-gray-700",
  "ゴールド": "bg-accent/20 text-accent-dark",
  "プラチナ": "bg-gradient-to-br from-accent to-accent-dark text-[#241a03]",
};

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

// AIチャットボットの「スタッフ対応(通報・問い合わせの折り返し)」時間帯。
// AIチャットボット自体は24時間応答するが、通報・問い合わせの折り返しはこの時間帯に限られる。
export function isStaffBusinessHours(): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  let hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  if (hour === 24) hour = 0;
  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  return isWeekday && hour >= 9 && hour < 21;
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
