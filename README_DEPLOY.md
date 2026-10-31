# wasedashboard トラブルシューティング & 自動デプロイガイド

このドキュメントでは、GitHub Actions のデプロイエラー (`statusCode: 403`) の完全な解決手順を解説します。

---

## 🔒 statusCode: 403 エラーの完全解決手順 (IMG_1505 の解決)

### **原因**
GitHub Actions 内のビルド（`Build application`）は成功していますが、Firebase API を呼び出した際に Google Cloud から **`statusCode: 403`** が返されています。
これは GCP プロジェクト `wasedashboard` で **Firebase Hosting API が有効化されていない** か、**サービスアカウントの権限不足** が原因です。

---

### **解決手順 (2ステップ・1分で完了)**

#### **Step 1: Firebase Hosting API を有効化する**
以下の直リンクを開き、青い **「有効にする」** ボタンを押してください：
👉 **[Firebase Hosting API 有効化ページ](https://console.cloud.google.com/apis/library/firebasehosting.googleapis.com?project=wasedashboard)**

#### **Step 2: サービスアカウントに Firebase 管理者権限を付与する**
1. 以下の直リンクを開きます：
   👉 **[Google Cloud IAM 管理画面](https://console.cloud.google.com/iam-admin/iam?project=wasedashboard)**
2. GitHub Secrets に登録したサービスアカウント（`firebase-adminsdk-...@wasedashboard.iam.gserviceaccount.com`）の右側にある **「編集 (鉛筆アイコン)」** をクリック。
3. **「別のロールを追加」** をクリック。
4. **「Firebase 管理者」** (`roles/firebase.admin`) または **「Firebase Hosting 管理者」** (`roles/firebasehosting.admin`) を選択して **「保存」**。

---

## 🚀 デプロイの再実行

設定完了後、GitHub Actions の **Actions** タブで失敗したワークフローの **「Re-run all jobs」** をクリックすると、自動デプロイが完了します！
