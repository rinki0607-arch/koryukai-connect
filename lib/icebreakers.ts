// AI(Anthropic API)に頼らず、相手のプロフィール情報をもとにテンプレートで
// 話しかけのきっかけ文を組み立てる。外部APIを呼ばないため、APIキーの契約状態や
// 残高に関係なく常に動作する。

export interface IcebreakerPartner {
  name?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  connectWith?: string | null;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildIcebreakerSuggestions(partner: IcebreakerPartner): string[] {
  const name = partner.name?.trim();
  const honorific = name ? `${name}さん` : "〇〇さん";

  // 相手のプロフィール(業種・繋がりたい人・会社・役職)に触れたもの。
  // 入力されている項目だけが候補に入る。
  const personalized: string[] = [];
  if (partner.industry) {
    personalized.push(
      `${honorific}、${partner.industry}のお仕事をされているんですね!今どんなことに力を入れていらっしゃるか、よければ伺ってみたいです😊`
    );
  }
  if (partner.connectWith) {
    personalized.push(
      `${honorific}が「${partner.connectWith}」という繋がりを探されていると伺いました。詳しくお話を聞かせていただけますか?`
    );
  }
  if (partner.company) {
    personalized.push(
      `${honorific}は${partner.company}でご活躍されているんですね!普段どんなお仕事をされているのか気になります。`
    );
  }
  if (partner.jobTitle) {
    personalized.push(
      `${honorific}は${partner.jobTitle}をされているんですね。どんなきっかけで今のお仕事を始められたんですか?`
    );
  }

  // プロフィール情報の有無にかかわらず使える定番の一言(必ず一定数は用意しておく)。
  const generic: string[] = [
    `${honorific}、マッチありがとうございます!今回の交流会はどんなきっかけで参加されたんですか?`,
    `${honorific}、はじめまして!最近力を入れていることがあれば、ぜひ聞かせてください。`,
    `${honorific}とお話しできて嬉しいです。お互いに繋がりたい人の話、少し伺ってもいいですか?`,
    `${honorific}、よろしくお願いします!お仕事で今一番楽しいと感じることって何ですか?`,
    `${honorific}、交流会お疲れさまでした!次回はどんなテーマの会だと参加してみたいですか?`,
  ];

  const pool = shuffle([...personalized, ...shuffle(generic)]);
  return pool.slice(0, 3);
}
