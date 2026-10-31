# GitHub 経由での Firebase Hosting 自動デプロイ設定ガイド

このプロジェクトには、GitHub リポジトリに `push` または `pull request` を作成した際に、Firebase Hosting へ自動でビルド＆デプロイを行う GitHub Actions ワークフローが設定されています。

---

## 🚀 構成ファイル

- **`firebase.json`**: Firebase Hosting の配信設定（ルートディレクトリ: `dist`、SPA リライト設定、キャッシュヘッダー、Firestoreルール）
- **`.firebaserc`**: デフォルトプロジェクト `wasedashboard` の指定
- **`.github/workflows/firebase-hosting-merge.yml`**: `main` または `master` ブランチへの push 時に本番（Live チャンネル）へ自動デプロイ
- **`.github/workflows/firebase-hosting-pull-request.yml`**: プルリクエスト作成時に一時プレビュー環境へ自動デプロイ

---

## 🔑 GitHub Secrets の設定手順

GitHub Actions が Firebase Hosting にアクセスしてデプロイを実行するために、GitHub リポジトリの Secrets にサービスアカウントキーを登録します。

### 方法 1: Firebase CLI による自動設定（推奨）

ローカル環境またはターミナルで Firebase CLI を使用して以下のコマンドを実行します：

```bash
firebase login
firebase init hosting:github
```

1. 対象プロジェクトとして `wasedashboard` を選択
2. 連携する GitHub リポジトリ（例: `username/repository`）を入力
3. デプロイ前ビルドスクリプトとして `npm ci && npm run build` を承認
4. 自動で GitHub Secrets に `FIREBASE_SERVICE_ACCOUNT_WASEDASHBOARD` が生成・登録されます！

---

### 方法 2: Google Cloud Console から手動で設定する場合

1. **[Google Cloud Console (サービス アカウント)](https://console.cloud.google.com/iam-admin/serviceaccounts?project=wasedashboard)** にアクセス。
2. サービスアカウントを作成（または既存の Firebase デプロイ用アカウントを選択）。
   - 付与するロール: **Firebase Hosting 管理者** (`roles/firebasehosting.admin`)
3. サービスアカウントの「キー」タブから **「鍵を追加」 > 「新しい鍵を作成」 > 「JSON」** を選択してダウンロード。
4. GitHub リポジトリに移動し、**Settings > Secrets and variables > Actions** を開く。
5. **New repository secret** をクリック：
   - Name: `FIREBASE_SERVICE_ACCOUNT_WASEDASHBOARD`
   - Secret: ダウンロードした JSON ファイルの中身をそのまま貼り付け
6. **Add secret** を押して保存します。

---

## 📌 デプロイの実行

上記の設定完了後、リポジトリにコミットを push するだけで自動的に GitHub Actions が起動し、Firebase Hosting へ本番反映されます：

```bash
git add .
git commit -m "feat: setup Firebase Hosting automated deployment"
git push origin main
```
