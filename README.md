# koryukai-connect <!-- deploy-test 3 -->


交流会運営DXアプリ。参加登録フォーム・運営ダッシュボード・参加者マッチング・交流会一覧を1つのWebアプリにまとめたもの。

## 構成

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres / Auth / RLS)
- Vercel (ホスティング)

## セットアップ(ローカル開発)

```bash

<!-- deploy-test: rinki0607-arch commit -->

npm install
cp .env.example .env.local  # Supabaseのプロジェクト情報を入力
npm run dev
```

## データベース

`supabase/schema.sql` を Supabase の SQL Editor で実行するとテーブル・RLSポリシー・関数一式

<!-- deploy-test 2: rinki0607-arch commit -->
が作成されます。

## 管理者権限の付与

新規登録したユーザーは既定で `participant`(参加者)ロールです。運営メンバーを管理者にするには、Supabase の SQL Editor で以下を実行してください。

```sql
update public.profiles set role = 'admin' where email = 'admin@example.com';
```



