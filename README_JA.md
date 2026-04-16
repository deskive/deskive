<p align="center">
  <a href="https://deskive.com">
    <img src="frontend/public/logo.png" alt="Deskive" width="80">
  </a>
</p>

<p align="center">
  <h1 align="center">Deskive</h1>
  <p align="center">
    <strong>オープンソースワークスペースコラボレーションプラットフォーム</strong>
  </p>
  <p align="center">
    リアルタイムチャット、ビデオ通話、プロジェクト管理、ファイル共有、カレンダー、ノート、AIツール — すべてを一つに。
  </p>
</p>

<p align="center">
  <img src="docs/hero-preview.gif" alt="Deskive landing hero preview" width="820">
</p>

<p align="center">
  <a href="https://github.com/deskive/deskive/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-GNU%20AGPL%203.0-blue.svg" alt="License"></a>
  <a href="https://github.com/deskive/deskive/stargazers"><img src="https://img.shields.io/github/stars/deskive/deskive?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/deskive/deskive/issues"><img src="https://img.shields.io/github/issues/deskive/deskive" alt="Issues"></a>
  <a href="https://github.com/deskive/deskive/pulls"><img src="https://img.shields.io/github/issues-pr/deskive/deskive" alt="Pull Requests"></a>
</p>

<p align="center">
  <a href="https://deskive.com">ウェブサイト</a> |
  <a href="#クイックスタート">クイックスタート</a> |
  <a href="https://github.com/deskive/deskive/discussions">ディスカッション</a> |
  <a href="CONTRIBUTING.md">コントリビューション</a>
</p>

<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README_JA.md">日本語</a> |
  <a href="./README_ZH.md">中文</a> |
  <a href="./README_KO.md">한국어</a> |
  <a href="./README_ES.md">Español</a> |
  <a href="./README_FR.md">Français</a> |
  <a href="./README_DE.md">Deutsch</a> |
  <a href="./README_PT-BR.md">Português</a> |
  <a href="./README_RU.md">Русский</a> |
  <a href="./README_HI.md">हिन्दी</a> |
  <a href="./README_AR.md">العربية</a>
</p>

---

## Deskiveとは？

Deskiveは、リアルタイムコミュニケーション、プロジェクト管理、生産性ツールを統合した**セルフホスト可能なワークスペースコラボレーションプラットフォーム**です。データを完全に管理したいチーム向けに構築されており、Slack + Notion + Zoom + Asanaの機能を単一のオープンソースアプリケーションで提供します。

ビデオ通話に有料プランが必要なSlackや、リアルタイムチャットがないNotionとは異なり、Deskiveは効果的なコラボレーションに必要なすべてを提供します。チャット、ビデオ通話、プロジェクトボード、ファイル共有、AIアシスタント — ベンダーロックインや独占的ライセンスなし。

<p align="center">
  <img src="frontend/public/dashboard.png" alt="Deskive Dashboard" width="800">
  <br>
  <em>統合されたコミュニケーションとプロジェクト管理を備えたDeskiveワークスペースダッシュボード</em>
</p>

### 仕組み

1. **ワークスペースを作成** — チャンネル、プロジェクト、カスタムロールでチームワークスペースを設定
2. **リアルタイムでコミュニケーション** — スレッド、リアクション、メンション、GIF、HDビデオ通話でチャット
3. **プロジェクトを管理** — カンバンボード、スプリント、タスク依存関係、時間追跡で作業を整理
4. **ドキュメントで協力** — バージョン管理とデジタル署名を備えたノート、ホワイトボード、ファイルを共有
5. **AIで自動化** — AutoPilotにスケジューリング、会議サマリー、日次ブリーフィングを任せる

### 主な機能

- **💬 リアルタイムコミュニケーション** — チャンネル、ダイレクトメッセージ、スレッド、リアクション、メンション、GIFサポート
- **📹 HDビデオ会議** — LiveKit経由の画面共有、録画、文字起こし機能付きビデオ通話
- **📋 プロジェクト管理** — カンバンボード、スプリント、マイルストーン、タスク依存関係、時間追跡
- **📁 ファイル管理** — バージョン管理、共有、Googleドライブ統合を備えたクラウドストレージ
- **📝 共同ノート** — リアルタイムコラボレーションとテンプレート機能付きブロックベースエディタ
- **📅 カレンダーとスケジューリング** — イベント管理、定期イベント、会議室、空き状況追跡
- **🎨 ホワイトボード** — ブレインストーミングと計画のためのビジュアルコラボレーションワークスペース
- **🤖 AIアシスタント** — スケジューリング、会議インテリジェンス、ドキュメント分析のためのAutoPilot
- **📊 フォームと分析** — レスポンス追跡とワークスペースメトリクス付きカスタムフォームビルダー
- **✅ 承認ワークフロー** — ドキュメントとプロセスのための組み込み承認システム
- **💰 予算追跡** — 経費管理、請求レート、予算監視
- **🔗 統合** — Slack、Googleドライブ、GitHub、Dropboxなどと接続
- **🔍 セマンティック検索** — すべてのコンテンツタイプにわたるAI駆動検索
- **🌍 国際化** — 多言語サポート（英語、日本語、拡張可能）

## 解決する問題

### コラボレーションツールの断片化ジレンマ

現代のチームは複数のサブスクリプションをやりくりしています：チャット用Slack（$8.75/ユーザー/月）、ビデオ用Zoom（$15.99/ユーザー/月）、プロジェクト用Asana（$10.99/ユーザー/月）、ドキュメント用Notion（$10/ユーザー/月）。これにより、断片化されたワークフロー、データサイロ、複数ベンダーによるセキュリティリスク、チームサイズに応じて線形的に増加するコストが発生します。

**私たちが対処する一般的な問題点：**

- ❌ **ツールの断片化** — 1日に5つ以上のツールを切り替えることで集中力と生産性が低下
- ❌ **コストの上昇** — 基本的なコラボレーションのためのSaaSサブスクリプションが$50+/ユーザー/月に
- ❌ **データロックイン** — データが他人のサーバーに保存され、エクスポートオプションが限定的
- ❌ **プライバシーの懸念** — 機密ビジネスデータが複数のサードパーティベンダーと共有される
- ❌ **統合の複雑さ** — 各ツールに個別のAPI統合と認証が必要
- ❌ **機能のギャップ** — 包括的なコラボレーション機能を提供する単一プラットフォームがない

### Deskiveのソリューション

✅ **オールインワンプラットフォーム** — チャット、ビデオ、プロジェクト、ファイル、カレンダー、ノート、AIを1つのアプリケーションに

✅ **セルフホスト＆オープンソース** — GNU AGPL 3.0ライセンスによる完全なデータ所有権

✅ **ユーザーごとのコストゼロ** — チームサイズに関係なく1つのインフラコスト

✅ **深い統合** — すべての機能がコンテキストとデータをシームレスに共有

✅ **エンタープライズ対応** — デジタル署名、承認ワークフロー、監査ログ、SSOサポート

## なぜDeskive？（比較）

| 機能 | Deskive | Slack | Notion | Asana | Microsoft Teams |
|---------|---------|-------|--------|-------|-----------------|
| **リアルタイムチャット** | ✅ チャンネル、スレッド、リアクション | ✅ | ⚠️ コメントのみ | ⚠️ コメントのみ | ✅ |
| **ビデオ通話** | ✅ HD、録画、文字起こし | ⚠️ ハドル（基本） | ❌ | ❌ | ✅ |
| **プロジェクト管理** | ✅ カンバン、スプリント、依存関係 | ❌ | ⚠️ 基本ボード | ✅ フル機能 | ⚠️ プランナー |
| **ファイル管理** | ✅ バージョン管理、共有、ドライブ同期 | ⚠️ 基本アップロード | ⚠️ 埋め込み | ⚠️ 添付 | ✅ SharePoint |
| **ノート＆ドキュメント** | ✅ ブロックエディタ、リアルタイムコラボ | ⚠️ キャンバス（基本） | ✅ フル機能 | ❌ | ⚠️ Loop |
| **カレンダー** | ✅ イベント、会議室、空き状況 | ❌ | ❌ | ⚠️ タイムライン表示 | ✅ |
| **ホワイトボード** | ✅ 共同ワークスペース | ❌ | ❌ | ❌ | ✅ |
| **AIアシスタント** | ✅ AutoPilot、会議インテリ | ⚠️ サマリー | ⚠️ ライティング | ⚠️ ステータス | ✅ Copilot |
| **フォームビルダー** | ✅ 分析付きカスタムフォーム | ❌ | ❌ | ✅ | ✅ |
| **予算追跡** | ✅ 経費、請求、予算 | ❌ | ❌ | ❌ | ❌ |
| **承認ワークフロー** | ✅ 組み込みシステム | ⚠️ ワークフロービルダー | ❌ | ✅ | ✅ Power Automate |
| **ボット自動化** | ✅ カスタムボット、トリガー/アクション | ✅ Bolt SDK | ❌ | ⚠️ ルール | ✅ Power Automate |
| **メール統合** | ✅ Gmail OAuth、SMTP/IMAP | ❌ | ❌ | ⚠️ メール→タスク | ✅ Outlook |
| **セルフホスト** | ✅ Docker Compose | ❌ | ❌ | ❌ | ❌ |
| **オープンソース** | ✅ GNU AGPL 3.0 | ❌ | ❌ | ❌ | ❌ |
| **デスクトップアプリ** | ✅ Tauri（Mac、Win、Linux） | ✅ Electron | ✅ Electron | ❌ | ✅ Electron |
| **学習曲線** | 🟢 低 | 🟢 低 | 🟡 中 | 🟡 中 | 🔴 高 |
| **価格** | 🟢 無料（セルフホスト） | 💰 $8.75/ユーザー/月 | 💰 $10/ユーザー/月 | 💰 $10.99/ユーザー/月 | 💰 $4/ユーザー/月 |

### Deskive vs オープンソース代替

上記のプロプライエタリ比較は「Slack + Notion + Asana の支払いをやめるべきか？」という文脈での話です。他のオープンソースのワークスペースツールと比較する場合、正直な評価は以下の通りです。専門特化ツールは各分野での深さでは優れていますが、すべての機能領域を1つのリポジトリで提供しているプロジェクトは他にありません。

| Feature | **Deskive** | [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | [Huly](https://github.com/hcengineering/platform) | [Plane](https://github.com/makeplane/plane) | [Nextcloud Hub](https://github.com/nextcloud/server) | [Mattermost](https://github.com/mattermost/mattermost) |
|---|---|---|---|---|---|---|
| **Real-time Chat** | ✅ チャンネル、スレッド、リアクション | ❌ | ✅ | ❌ | ✅ Talk | ✅ 最高クラス |
| **Video Calls** | ✅ HD、録画、文字起こし（LiveKit） | ❌ | ✅ バーチャルオフィス | ❌ | ✅ Talk | ⚠️ 基本的な通話 |
| **Docs / Notes** | ✅ Tiptap + Yjs ブロックエディタ | ✅ 最高クラス | ✅ 高機能 | ⚠️ Pages | ✅ OnlyOffice/Collabora | ❌ |
| **Project Management** | ✅ Kanban、スプリント、マイルストーン | ⚠️ ボードビュー | ✅ Linearレベルのトラッカー | ✅ Cycles + modules | ⚠️ Deckプラグイン | ⚠️ Boards（旧Focalboard） |
| **Whiteboard** | ✅ Excalidrawベース | ❌ | ❌ | ❌ | ⚠️ オプションアプリ | ❌ |
| **Calendar** | ✅ イベント、会議室、空き状況 | ❌ | ⚠️ チームプランナー | ❌ | ✅ Groupware | ❌ |
| **Forms Builder** | ✅ 19種類のフィールド、分析機能 | ⚠️ グリッドビュー | ❌ | ❌ | ⚠️ オプションアプリ | ❌ |
| **Approvals** | ✅ 組み込みワークフロー | ❌ | ❌ | ❌ | ⚠️ Flow | ⚠️ Playbooks |
| **Budget Tracking** | ✅ 経費、請求管理 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI Agent** | ✅ AutoPilot + ベクトル検索 | ✅ ローカルLLM（Mistral/Llama） | 📋 近日対応 | ⚠️ Pages assist | ✅ Assistant | ⚠️ Copilot |
| **Bots / Automation** | ✅ カスタムボット、トリガー | ❌ | ❌ | ⚠️ | ✅ Flow | ✅ Webhooks |
| **Integrations Catalog** | **180+ カタログ、6+ OAuth事前統合** | ~1（Zapierリンク） | 1（GitHub双方向） | ~16（GH、GL、Slack、Sentry など） | 200+（Nextcloud app store） | ~40–50（マーケットプレイス） |
| **Plugin Marketplace** | ❌（カタログは静的、サードパーティなし） | ❌ | ❌ | ❌ | ✅ 最高クラス | ✅ |
| **Self-Hosted** | ✅ Docker Compose | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Pluggable Providers** *(storage / AI / email / push / search / auth)* | ✅ 7種類すべて env var で切り替え可能 | ❌ | ❌ | ❌ | ❌（プラグイン） | ❌（プラグイン） |

### 正直なまとめ

- **機能ごとの深さでは**、専門ツールがそれぞれの分野で優れています：  
  AppFlowy はより高度なドキュメントエディタ、Huly はより深い Linear レベルのトラッカー、Plane は成熟したサイクル／モジュール機能、Mattermost は大規模運用で実績のあるチャット、Nextcloud は最大規模のアプリエコシステムを持っています。単一機能の比較では、必ずしも優位とは言えません。

- **単一データモデル上の機能の広さでは**、  
  12の機能領域すべてを1つのリポジトリ、1つのログイン、1つの権限モデルでネイティブに提供しているOSSプロジェクトはDeskiveのみです。Hulyが最も近いですが、forms / approvals / budget / whiteboard 機能は提供していません。この「統合ワークスペース」という価値は単なるマーケティングではなく、実際に意味のあるものです。

- **Pluggable Provider パターン（storage / AI / email / push / search / auth / video を env var レベルで切り替え）では**、  
  これを実現しているのはDeskiveのみです。他のプロジェクトではバックエンドサービスが固定されています。

チャット + ビデオ + ドキュメント + プロジェクト管理 + フォーム + 承認 + 予算管理 + AI を **すべて1つのツールで使いたい場合**、さらにインフラを自由に切り替えたい場合は、Deskiveが現時点で最も明確な選択です。

一方で、これらのうち **特定の機能だけが必要で**、その分野での最大の深さを重視する場合は、専門ツールの方が適しています。

一方で、これらのうち**特定の機能だけが必要で**、その分野での最大の深さを重視するなら、専門ツールの方が適しています。

### Deskiveのユニークな点

1. **真の統合プラットフォーム** — すべての機能が同じデータモデルと権限モデルを共有し、タスク、チャットメッセージ、ドキュメント、カレンダーイベントが同一ワークスペース内の第一級オブジェクトとして扱われる
2. **プラガブルインフラストラクチャ** — ストレージ、AI、メール、プッシュ通知、検索、認証、ビデオのバックエンドはすべて env var によって切り替え可能。R2 から GCS、OpenAI から Ollama、Gmail から Postmark、LiveKit から Jitsi へ、コード変更なしで移行できる
3. **妥協のないセルフホスティング** — ビデオ通話やAIを含め、SaaS代替製品と完全な機能パリティを実現
4. **モダンな技術スタック** — React 19、NestJS 11、TypeScript、Tiptap/Yjs、Excalidraw、LiveKit、Qdrantで構築
5. **AIネイティブ設計** — ベクトル検索、会話メモリー、AutoPilotエージェントがコアプラットフォームに組み込まれている
6. **コスト効率の高いスケーリング** — ユーザー単位課金のSaaSとは異なり、1つのインフラコストで無制限のユーザーに対応可能

## 📊 プロジェクトアクティビティと統計

Deskiveは成長するコミュニティを持つ**積極的にメンテナンスされている**プロジェクトです。現在の状況：

### GitHubアクティビティ

<p align="left">
  <img src="https://img.shields.io/github/stars/deskive/deskive?style=for-the-badge&logo=github&color=yellow" alt="GitHub Stars">
  <img src="https://img.shields.io/github/forks/deskive/deskive?style=for-the-badge&logo=github&color=blue" alt="Forks">
  <img src="https://img.shields.io/github/contributors/deskive/deskive?style=for-the-badge&logo=github&color=green" alt="Contributors">
  <img src="https://img.shields.io/github/last-commit/deskive/deskive?style=for-the-badge&logo=github&color=orange" alt="Last Commit">
</p>

<p align="left">
  <img src="https://img.shields.io/github/issues/deskive/deskive?style=for-the-badge&logo=github&color=red" alt="Open Issues">
  <img src="https://img.shields.io/github/issues-pr/deskive/deskive?style=for-the-badge&logo=github&color=purple" alt="Open PRs">
  <img src="https://img.shields.io/github/issues-closed/deskive/deskive?style=for-the-badge&logo=github&color=green" alt="Closed Issues">
  <img src="https://img.shields.io/github/issues-pr-closed/deskive/deskive?style=for-the-badge&logo=github&color=blue" alt="Closed PRs">
</p>

### コミュニティメトリクス

| メトリック | ステータス | 詳細 |
|--------|--------|---------|
| **総コントリビューター** | ![Contributors](https://img.shields.io/github/contributors/deskive/deskive?style=flat-square) | 世界中の開発者による成長するコミュニティ |
| **総コミット** | ![Commits](https://img.shields.io/github/commit-activity/t/deskive/deskive?style=flat-square) | 開始以来の積極的な開発 |
| **月次コミット** | ![Commit Activity](https://img.shields.io/github/commit-activity/m/deskive/deskive?style=flat-square) | 定期的なアップデートと改善 |
| **コード品質** | ![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen?style=flat-square) | TypeScript、ESLint、Prettier適用 |
| **ドキュメント** | ![Docs](https://img.shields.io/badge/docs-comprehensive-blue?style=flat-square) | 詳細なガイドとAPIドキュメント |

### 言語とコード統計

<p align="left">
  <img src="https://img.shields.io/github/languages/top/deskive/deskive?style=for-the-badge&logo=typescript&color=blue" alt="Top Language">
  <img src="https://img.shields.io/github/languages/count/deskive/deskive?style=for-the-badge&color=purple" alt="Language Count">
  <img src="https://img.shields.io/github/repo-size/deskive/deskive?style=for-the-badge&color=orange" alt="Repo Size">
  <img src="https://img.shields.io/github/license/deskive/deskive?style=for-the-badge&color=green" alt="License">
</p>

### 最近のアクティビティハイライト

- ✅ **40以上のモジュール** — モジュラーアーキテクチャを持つ包括的なバックエンドAPI
- ✅ **148のデータベーステーブル** — マイグレーション付きプロダクション対応スキーマ
- ✅ **HDビデオ会議** — 録画と文字起こし機能付きLiveKit統合
- ✅ **AI AutoPilot** — タスク自動化とスケジューリングのためのインテリジェントエージェント
- ✅ **多言語サポート** — 英語と日本語のi18n
- ✅ **デスクトップアプリ** — macOS、Windows、Linux用Tauriベースアプリ

### これらの数字が重要な理由

**積極的なメンテナンス** — 定期的なコミットと迅速なイシュー対応はプロジェクトが積極的にメンテナンスされサポートされていることを示します

**モダンなコードベース** — 全体的なTypeScriptは型安全性、より良い開発者体験、より少ないランタイムエラーを保証します

**プロダクション対応** — 40以上のバックエンドモジュールを持つ包括的な機能セットはMVPを超えた成熟度を示します

**コミュニティの成長** — 増加するコントリビューターベースと活発なディスカッションは健全なコミュニティエンゲージメントを示します

**オープン開発** — すべての開発は透明な意思決定とロードマップで公開されています

### アクティビティに参加しましょう！

ここにあなたの貢献を表示したいですか？下記の[クイックコントリビューションガイド](#-クイックコントリビューションガイド)をチェック！

## クイックスタート

### Docker（推奨）

プロジェクトルートから次のコマンドを実行：

```bash
git clone https://github.com/deskive/deskive.git
cd deskive
cp .env.docker .env
# 設定を編集（データベース資格情報、APIキーなど）
docker compose up -d
```

これで完了！`http://localhost:5175`でアプリにアクセスし、`http://localhost:3000`でAPIにアクセスできます。

### 手動セットアップ

**前提条件：** Node.js 20+、PostgreSQL 15+、Redis 7+

```bash
# クローン
git clone https://github.com/deskive/deskive.git
cd deskive

# バックエンド
cd backend
cp .env.example .env    # 設定を編集
npm install
npm run migrate         # データベースマイグレーション実行
npm run start:dev

# フロントエンド（新しいターミナルで）
cd frontend
cp .env.example .env
npm install
npm run dev
```

フロントエンド：`http://localhost:5175` | バックエンド：`http://localhost:3000`

### ワンコマンドスタート

開発環境用：

```bash
./start.sh
```

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                  フロントエンド（React 19）                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │チャット  │  │プロジェクト│  │ファイル  │  │カレンダー│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         Vite + TypeScript + Tailwind CSS + Radix UI         │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + Socket.io
┌────────────────────────┴────────────────────────────────────┐
│                 バックエンド（NestJS 11）                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  認証    │  │チャット  │  │タスク    │  │   AI     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         40以上のモジュール + TypeScript + Raw SQL            │
└────────┬─────────────┬─────────────┬─────────────┬──────────┘
         │             │             │             │
    ┌────┴────┐   ┌────┴────┐  ┌────┴────┐   ┌────┴────┐
    │Postgres │   │  Redis  │  │ Qdrant  │   │LiveKit  │
    │(ストレージ)│   │(キャッシュ)│  │(ベクトル)│   │(ビデオ) │
    └─────────┘   └─────────┘  └─────────┘   └─────────┘
```

**フロントエンド**（`/frontend`）— React 19とVite、TypeScript、Tailwind CSS、Radix UIコンポーネント、状態管理用Zustand、データフェッチ用React Query

**バックエンド**（`/backend`）— NestJS 11とTypeScript、生SQLを使用するPostgreSQL、キャッシングとリアルタイム機能用Redis、WebSocket接続用Socket.io

**AI＆検索** — ベクトル埋め込み用Qdrant、GPT-4o-miniとWhisper文字起こし用OpenAI

**ビデオ** — HDビデオ通話、画面共有、録画、リアルタイム文字起こし用LiveKit

## 機能モジュール

Deskiveは以下のカテゴリーにわたる40以上の統合モジュールを搭載：

| カテゴリー | モジュール |
|----------|---------|
| **コミュニケーション** | チャット（チャンネル、DM、スレッド）、ビデオ通話（HD、録画）、メール（Gmail OAuth、SMTP/IMAP）、通知 |
| **プロジェクト管理** | タスク、マイルストーン、スプリント、カンバンボード、時間追跡、依存関係、ラベル |
| **コンテンツ** | ノート（ブロックエディタ）、ドキュメント（デジタル署名）、ホワイトボード、ファイル管理（バージョン管理、共有） |
| **生産性** | カレンダー（イベント、会議室）、フォーム（ビルダー、分析）、承認（ワークフロー）、予算（経費、請求） |
| **AI＆自動化** | AutoPilot（エージェント）、会議インテリジェンス、ドキュメント分析、ボット（トリガー、アクション、スケジューリング） |
| **プラットフォーム** | 認証（OAuth、SSO）、ワークスペース管理、ロール＆権限、検索（セマンティック）、分析、統合 |

[詳細な機能ドキュメントを見る &rarr;](https://github.com/deskive/deskive/wiki)

## プラガブルプロバイダー

すべてのバックエンドサービスは単一の環境変数で差し替え可能です。デフォルト設定ではクラウド認証情報なしでDeskiveを実行できます。準備が整ったらマネージドプロバイダーに切り替えてください。

| ドメイン | 環境変数 | 同梱プロバイダー |
|---|---|---|
| **ストレージ** (PR [#28](https://github.com/deskive/deskive/pull/28)) | `STORAGE_PROVIDER` | `local-fs` (デフォルト), `s3`, `r2`, `minio`, `b2`, `gcs`, `azure`, `none` |
| **メール** (PR [#30](https://github.com/deskive/deskive/pull/30)) | `EMAIL_PROVIDER` | `smtp`, `resend`, `sendgrid`, `postmark`, `ses`, `mailgun`, `none` |
| **プッシュ** (PR [#31](https://github.com/deskive/deskive/pull/31)) | `PUSH_PROVIDER` | `webpush`, `fcm`, `onesignal`, `expo`, `none` |
| **検索** (PR [#32](https://github.com/deskive/deskive/pull/32)) | `SEARCH_PROVIDER` | `pg-trgm` (デフォルト、追加インフラ不要), `meilisearch`, `typesense`, `none` |
| **認証 / SSO** (PR [#33](https://github.com/deskive/deskive/pull/33)) | `AUTH_PROVIDERS` | `local`, `google`, `github`, `magic-link` (パスワードレス、JWTベース) |
| **ビデオ** | `VIDEO_PROVIDER` | `livekit`, `jitsi`, `daily`, `agora`, `whereby`, `none` |
| **AI** | `AI_PROVIDER` | `openai`, `anthropic`, `gemini`, `groq`, `ollama` (ローカル) |

- **キーワード検索とセマンティック検索が共存。** `SearchProviderService` がトライグラム/ファセット付きキーワード検索を処理し、`SearchService` は引き続き Qdrant ベクトル/セマンティック検索を担当します。
- **オプションSDKは遅延読み込み** — `@azure/storage-blob`、`@google-cloud/storage`、`firebase-admin`、`livekit-server-sdk`、`agora-token` は `optionalDependencies` のため、`local-fs` / `smtp` / `webpush` / `pg-trgm` を選択してもインストールコストはゼロです。
- **スモークテスト** は各アダプターに同梱 (`backend/scripts/smoke-test-*-providers.ts`) — ストレージ / メール / プッシュ / 検索 / 認証でそれぞれ 27 / 45 / 61 / 55 / 37 のアサーションがあり、すべてパスしています。
- **完全なドキュメント：** プロバイダーごとの環境変数とセットアップについては `backend/docs/providers/` を参照してください。

## 国際化

Deskiveはreact-i18next経由で複数言語をサポート：

- 英語（en）、日本語（ja）

新しい言語を追加したいですか？`frontend/src/i18n/locales/`で翻訳を貢献してください。[翻訳ガイド](CONTRIBUTING.md)を参照。

## 🚀 なぜDeskiveに貢献するのか？

Deskiveは単なるオープンソースプロジェクトではありません。モダンな開発実践を習得しながらチームコラボレーションの未来を構築する機会です。

### 得られるもの

**📚 モダンな技術スタックを学ぶ**
- **React 19** — 並行機能とサーバーコンポーネントを持つ最新React
- **NestJS 11** — 依存性注入を持つエンタープライズグレードNode.jsフレームワーク
- **全体的なTypeScript** — 強い型付け、より良いIDEサポート、より少ないバグ
- **PostgreSQL + 生SQL** — ORMマジックなしのデータベース設計
- **リアルタイムシステム** — WebSocket用Socket.io、pub/sub用Redis
- **AI統合** — OpenAI埋め込み、Qdrantでのベクトル検索

**💼 ポートフォリオを構築**
- 世界中のチームが使用する**プロダクション対応**プラットフォームに貢献
- GitHubプロフィールに表示される機能に取り組む
- コントリビューター殿堂で認識される
- **コラボレーションプラットフォーム**と**リアルタイムシステム**の専門知識を構築 — 2026年に高く評価されるスキル

**🤝 成長するコミュニティに参加**
- 世界中の開発者とつながる
- 経験豊富なメンテナーからコードレビューを受ける
- ソフトウェアアーキテクチャのベストプラクティスを学ぶ
- 技術的なディスカッションと設計決定に参加

**🎯 実際の影響を与える**
- あなたのコードはチームが高価なSaaSサブスクリプションから解放されるのを助けます
- プロダクション環境で使用される機能を見る
- オープンソースコラボレーションツールの方向性に影響を与える

**⚡ クイックオンボーディング**
- Docker Composeで**5分未満**で実行可能
- 明確なアーキテクチャを持つよく文書化されたコードベース
- 48時間以内にPRに応答するフレンドリーなメンテナー
- 初心者向けの「良い最初のイシュー」ラベル

## 🎯 クイックコントリビューションガイド

**10分未満**で貢献を開始：

### ステップ1：環境をセットアップ

```bash
# GitHubでリポジトリをフォークし、フォークをクローン
git clone https://github.com/YOUR_USERNAME/deskive.git
cd deskive

# Dockerで開始（最も簡単な方法）
cp .env.docker .env
docker compose up -d

# アプリにアクセス
# フロントエンド：http://localhost:5175
# バックエンドAPI：http://localhost:3000
```

**これで完了！**Deskiveがローカルで実行中です。

### ステップ2：取り組むものを見つける

経験レベルに基づいて選択：

**🟢 初心者向け**
- 📝 [タイポの修正またはドキュメントの改善](https://github.com/deskive/deskive/labels/documentation)
- 🌍 [翻訳の追加](https://github.com/deskive/deskive/labels/i18n) — 英語と日本語をサポート
- 🐛 [シンプルなバグ修正](https://github.com/deskive/deskive/labels/good%20first%20issue)
- ✨ [UI/UXの改善](https://github.com/deskive/deskive/labels/ui%2Fux)

**🟡 中級者向け**
- 🔗 新しい統合を追加 — [統合ガイド](backend/README.md#integrations)参照
- 🧪 [テストを書く](https://github.com/deskive/deskive/labels/tests)
- 🚀 [パフォーマンス改善](https://github.com/deskive/deskive/labels/performance)
- 📱 [モバイルレスポンシブネス](https://github.com/deskive/deskive/labels/mobile)

**🔴 上級者向け**
- 🤖 [AI機能](https://github.com/deskive/deskive/labels/ai) — AutoPilot拡張、新しいAI機能
- ⚙️ [コアエンジン拡張](https://github.com/deskive/deskive/labels/core)
- 🏗️ [アーキテクチャ改善](https://github.com/deskive/deskive/labels/architecture)
- 🔐 [セキュリティ機能](https://github.com/deskive/deskive/labels/security)

### ステップ3：変更を加える

```bash
# 新しいブランチを作成
git checkout -b feature/your-feature-name

# 変更を加える
# - バックエンドコード：/backend/src/modules
# - フロントエンドコード：/frontend/src
# - データベースマイグレーション：/backend/migrations

# 変更をテスト
npm test

# 明確なメッセージでコミット
git commit -m "feat: XYZ用の新しい統合を追加"
```

### ステップ4：プルリクエストを提出

```bash
# フォークにプッシュ
git push origin feature/your-feature-name

# GitHubでPRを開く
# - 何を変更したか、なぜ変更したかを説明
# - 関連するイシューにリンク
# - UIの変更の場合はスクリーンショットを追加
```

**次に何が起こるか？**
- ✅ 自動テストがPRで実行されます
- 👀 メンテナーがコードをレビューします（通常48時間以内）
- 💬 変更や改善を提案する場合があります
- 🎉 承認されたら、コードがマージされます！

### コントリビューションのヒント

✨ **小さく始める** — 最初のPRは大きな機能である必要はありません

📖 **コードを読む** — 参考のために`backend/src/modules`の既存モジュールを閲覧

❓ **質問する** — 詰まったら[GitHubディスカッション](https://github.com/deskive/deskive/discussions)を開く

🧪 **テストを書く** — テスト付きPRはより早くマージされます

📝 **コードを文書化** — 複雑なロジックにコメントを追加

### ヘルプが必要ですか？

- 💡 [GitHubディスカッション](https://github.com/deskive/deskive/discussions) — 質問、アイデアを共有
- 📖 [コントリビューションガイド](CONTRIBUTING.md) — 詳細なコントリビューションガイドライン
- 🐛 [GitHubイシュー](https://github.com/deskive/deskive/issues) — バグ報告や機能リクエスト

## コントリビューション

私たちは貢献を歓迎します！始めるには[コントリビューションガイド](CONTRIBUTING.md)を参照してください。

**貢献方法：**
- [GitHubイシュー](https://github.com/deskive/deskive/issues)でバグ報告や機能リクエスト
- バグ修正や新機能のプルリクエストを提出
- 新しい統合を追加（[統合ガイド](backend/README.md#integrations)参照）
- ドキュメントの改善
- 翻訳の追加

## コントリビューター

Deskiveに貢献してくれたすべての素晴らしい人々に感謝します！🎉

<a href="https://github.com/deskive/deskive/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=deskive/deskive&anon=1&max=100&columns=10" />
</a>

ここにあなたの顔を表示したいですか？[コントリビューションガイド](CONTRIBUTING.md)をチェックして今日から貢献を開始しましょう！

## 💬 コミュニティに参加

開発者とつながり、ヘルプを得て、Deskiveの最新開発について最新情報を入手しましょう！

<p align="center">
  <a href="https://github.com/deskive/deskive/discussions">
    <img src="https://img.shields.io/badge/GitHub-Discussions-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Discussions">
  </a>
</p>

### どこで見つけるか

| プラットフォーム | 目的 | リンク |
|----------|---------|------|
| 💡 **GitHubディスカッション** | 質問、アイデア共有、機能リクエスト | [ディスカッションを開始](https://github.com/deskive/deskive/discussions) |
| 🐛 **GitHubイシュー** | バグ報告、機能リクエスト | [イシューを開く](https://github.com/deskive/deskive/issues) |
| 🌐 **ウェブサイト** | ドキュメント、ガイド、アップデート | [deskive.com](https://deskive.com) |

### コミュニティガイドライン

- 🤝 **敬意を持つ** — すべての人を尊重と優しさで扱う
- 💡 **知識を共有** — 他の人が学び成長するのを助ける
- 🐛 **イシューを報告** — バグを見つけたら？GitHubイシューで教えてください
- 🎉 **成功を祝う** — Deskiveの実装とユースケースを共有
- 🌍 **グローバルに考える** — 複数言語をサポートする世界的なコミュニティです

## ライセンス

このプロジェクトは[GNU Affero General Public License v3.0](LICENSE)の下でライセンスされています。

Copyright 2025 Deskive Contributors.

## 謝辞

NestJS、React、PostgreSQL、Redis、TypeScript、Tailwind CSS、LiveKit、OpenAI、Qdrantで構築されています。

---

<p align="center">
  <a href="https://deskive.com">ウェブサイト</a> |
  <a href="https://github.com/deskive/deskive/wiki">ドキュメント</a> |
  <a href="https://github.com/deskive/deskive/discussions">ディスカッション</a>
</p>

---

<p align="center">
  <strong><a href="https://github.com/deskive">Deskive</a>コミュニティによって❤️で構築</strong>
</p>

<p align="center">
  このプロジェクトが役立つと思ったら、スターを付けることを検討してください！⭐
  <br><br>
  <a href="https://github.com/deskive/deskive/stargazers">
    <img src="https://img.shields.io/github/stars/deskive/deskive?style=social" alt="Star on GitHub">
  </a>
</p>
