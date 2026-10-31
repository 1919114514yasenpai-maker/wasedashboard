# wasedashboard トラブルシューティング & 自動デプロイガイド

このドキュメントでは、GitHub のシークレット警告 (`Secret Scanning`) の対処方法、および GitHub Actions のデプロイエラー (`Failing after 9s`) の完全な解決手順を解説します。

---

## 🛠 1. GitHub Secret Scanning 警告の解除方法 (IMG_1501 の解決)

### **原因**
過去のコミットに `firebase-applet-config.json` 内の Google API キーが含まれていたため、GitHub の自動スキャンが検知しました。

### **対応作業（完了済み & 今後の手順）**
1. **`.gitignore` に追加済み**:
   `firebase-applet-config.json` を `.gitignore` に追加したため、今後 Firebase のキーファイルがコミットされることはありません。
2. **GitHub 上でアラートを終了する手順**:
   - GitHub リポジトリ（`1919114514yasenpai-maker/wasedashboard`）の **Security** タブを開きます。
   - **Secret scanning** をクリックします。
   - 該当の警告 `Google API Key` を選択し、右上メニューから **Close alert** ＞ **Used in tests** または **False positive** を選択してアラーを終了してください。
   *(※ Firebase クライアント用 API Key は公開前提の識別子ですが、GitHub での警告解除を行うことで表示が消えます。)*

---

## 🚀 2. GitHub Actions デプロイ失敗の解決方法 (IMG_1502 の解決)

### **原因**
GitHub Actions ワークフロー (`build_and_deploy`) で必要なサービスアカウント秘密鍵 (`FIREBASE_SERVICE_ACCOUNT_WASEDASHBOARD`) が、GitHub リポジトリの Secret に登録されていないため 9 秒で即座にエラーとなっていました。

### **解決手順 (3分で完了)**

#### **Step 1: Google Cloud Console からサービスアカウント鍵を取得**
1. **[Google Cloud Console サービスアカウント画面](https://console.cloud.google.com/iam-admin/serviceaccounts?project=wasedashboard)** にアクセス。
2. プロジェクト `wasedashboard` 内のサービスアカウント（例: `firebase-adminsdk-...` またはデプロイ用アカウント）をクリック。
3. **「キー (Keys)」** タブ ＞ **「鍵を追加 (Add Key)」** ＞ **「新しい鍵を作成 (Create new key)」** をクリック。
4. キーのタイプに **「JSON」** を選択して **「作成」**。鍵ファイル (JSON) が PC にダウンロードされます。

#### **Step 2: GitHub リポジトリに Secret を追加**
1. GitHub リポジトリ **`1919114514yasenpai-maker/wasedashboard`** を開きます。
2. 上部タブの **Settings** ＞ 左メニューの **Secrets and variables** ＞ **Actions** を選択。
3. **New repository secret** をクリック：
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_WASEDASHBOARD`
   - **Secret**: ダウンロードした JSON ファイルの中身（テキスト全体）をコピー＆ペースト。
4. **Add secret** ボタンを押して保存。

#### **Step 3: デプロイの再実行**
GitHub Actions の **Actions** タブで失敗したワークフローの **Re-run all jobs** を押すか、コードを push すると自動でビルド＆デプロイが成功します！

---

## 📌 今後の開発手順

```bash
# 変更をコミットしてメインブランチに push すると自動デプロイが走ります
git add .
git commit -m "fix: ignore firebase secret config and update app branding to wasedashboard"
git push origin main
```
