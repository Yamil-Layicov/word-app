# Word App — Project Plan və Architecture Notes

Bu sənəd Word App layihəsində verilən əsas texniki qərarları, product ideyalarını, gələcək roadmap-i və clean architecture prinsiplərini qeyd etmək üçün hazırlanıb.

Layihənin məqsədi multi-language vocabulary learning platform qurmaqdır. İstifadəçi fərqli dillər arasında sözlər əlavə edə, onları müxtəlif oyunlarla öyrənə, təkrar bildirişləri ala, progress görə və gələcəkdə public/community hissədə sözlərini, deck-lərini paylaşa biləcək.

---

## 1. Core Product Vision

Word App sadəcə “söz əlavə et” app-ı deyil. Məqsəd daha genişdir:

* Fərqli dil cütləri ilə söz öyrənmək
* Sözləri oyunlarla təkrar etmək
* Spaced repetition / reminder sistemi qurmaq
* Push notification ilə təkrar vaxtını xatırlatmaq
* Public feed və community sistemi yaratmaq
* Deck / collection paylaşmaq
* Country-based və global paylaşım etmək
* Admin dashboard ilə sistemi idarə etmək

---

## 2. Tech Stack

### Mobile

* React Native
* Expo
* Expo Router
* Zustand
* TanStack Query
* Expo Notifications

### Backend

* Node.js
* NestJS
* TypeScript
* PostgreSQL
* Prisma ORM
* Prisma PostgreSQL Driver Adapter
* Redis
* BullMQ
* JWT Auth
* bcrypt

### Infrastructure / Dev

* Docker Compose
* PostgreSQL container
* Redis container
* pnpm workspace
* Monorepo structure

---

## 3. Monorepo Structure

Current planned structure:

```txt
word-app/
  apps/
    api/
    mobile/
    admin/
  packages/
    shared/
  docs/
    PROJECT_PLAN.md
```

Current active apps:

```txt
apps/api     NestJS backend
apps/mobile  React Native mobile app, to be created later
```

Future:

```txt
apps/admin   Web-based admin dashboard
```

---

## 4. Architecture Principles

Project SOLID və clean architecture prinsiplərinə uyğun yazılmalıdır.

Əsas qayda:

```txt
Controller -> Service -> Repository -> Prisma
```

### Controller

* HTTP request/response layer
* Business logic yazılmamalıdır
* Prisma görməməlidir

### Service

* Business logic saxlayır
* Validation flow və use-case burada idarə olunur
* Birbaşa `process.env` oxumamalıdır
* Config üçün `ConfigService` istifadə olunmalıdır

### Repository

* Database query-lər burada olur
* Prisma yalnız repository layer-də istifadə olunur

### DTO

* Request validation üçün istifadə olunur
* `class-validator` və `class-transformer` ilə işləyir

### Mapper

* Response shape mapper fayllarında hazırlanır
* Service içində inline response object yığmaqdan qaçırıq

### Config

* `process.env` birbaşa service-lərdə istifadə olunmur
* `ConfigService` istifadə olunur

### Security

* Password heç vaxt plain saxlanmır
* Password response-da dönmür
* Refresh token plain saxlanmır, hash-lənir
* User request body ilə `role`, `status`, `isAdmin` kimi field göndərə bilməməlidir
* Global `ValidationPipe` aktivdir

---

## 5. Current Completed Work

### Project Setup

* Monorepo yaradıldı
* Docker Compose əlavə edildi
* PostgreSQL container işləyir
* Redis container işləyir
* Root scripts əlavə edildi
* Git commit-lər başladı

### Backend Setup

* NestJS API yaradıldı
* Prisma qoşuldu
* Prisma 7 üçün `prisma.config.ts` istifadə olunur
* `@prisma/adapter-pg` və `pg` əlavə edildi
* `PrismaService` yaradıldı
* `DatabaseModule` yaradıldı
* `ConfigModule` aktiv edildi
* Global validation pipe aktiv edildi
* CORS aktiv edildi
* Backend portu `4000` olaraq təyin edildi

### Seed Data

Seed edilən ölkələr:

```txt
AZ
TR
RU
NO
ES
US
GB
```

Seed edilən dillər:

```txt
az
en
ru
tr
es
no
```

Seed edilən language pair-lər:

```txt
EN -> AZ
RU -> AZ
TR -> AZ
AZ -> EN
RU -> EN
```

### Public Read Endpoints

Hazır endpoint-lər:

```txt
GET /countries
GET /languages
GET /language-pairs
```

### Auth Foundation

Əlavə edilən modellər:

```txt
User
UserProfile
UserLanguagePair
AuthSession
```

Əlavə edilən enum-lar:

```txt
UserRole
UserStatus
CefrLevel
AudienceScope
```

User role-lar:

```txt
USER
ADMIN
SUPER_ADMIN
```

User status-lar:

```txt
ACTIVE
BLOCKED
DELETED
```

### Register

`POST /auth/register` real işləyir.

Hazır funksiyalar:

* Email normalize olunur
* Duplicate email yoxlanır
* Language pair yoxlanır
* Country code yoxlanır
* Password bcrypt ilə hash olunur
* User, profile və user language pair yaradılır
* Response-da passwordHash dönmür
* Mapper istifadə olunur
* Repository pattern istifadə olunur

Qeyd:

`createUserWithProfile` içində Prisma nested write istifadə edilir. Bu atomic-dir. Profile və ya UserLanguagePair yaradılması fail olsa, User insert rollback olunur.

---

## 6. Auth Architecture Decision

Auth üçün sadəcə access token yox, access + refresh token sistemi olacaq.

### Access Token

* Qısa müddətli olacaq
* Default: 15 dəqiqə
* API request-lərində istifadə olunacaq

### Refresh Token

* Daha uzun müddətli olacaq
* Default: 7 gün
* Plain text database-də saxlanmayacaq
* Hash-lənmiş formada `AuthSession.refreshTokenHash` içində saxlanacaq

### AuthSession

`AuthSession` modelindən istifadə etməyimizin səbəbi:

* User birdən çox cihazda login ola bilsin
* Logout yalnız həmin session-u bağlasın
* Admin bütün session-ları revoke edə bilsin
* Şübhəli login-lər izlənə bilsin
* Refresh token təhlükəsiz saxlanılsın

---

## 7. Language System

Language system 3 ayrı anlayışa bölünür:

### App Interface Language

App-ın UI dili.

Məsələn:

```txt
az
en
tr
```

### Learning Language Pair

User-in öyrəndiyi dil cütü.

Məsələn:

```txt
EN -> AZ
RU -> AZ
AZ -> EN
```

### Active Language Pair

User çox language pair əlavə edə bilər, amma bir dənəsi aktiv olur.

Bu field ilə saxlanır:

```txt
UserProfile.activeLanguagePairId
```

Bu, `isActive=true` yanaşmasından daha təhlükəsizdir, çünki user üçün yalnız bir aktiv pair saxlanır.

---

## 8. Vocabulary Architecture Plan

Söz sistemi üçün əsas model kimi `VocabularyItem` düşünülür.

MVP üçün bu daha praktikdir:

```txt
VocabularyItem
  languagePairId
  sourceText
  targetText
  wordType
  cefrLevel
  difficulty
  createdById
```

Gələcəkdə lazım olsa daha normalize modelə keçmək olar:

```txt
Word
Translation
Sense
ExampleSentence
Pronunciation
```

### Word Type

İlk mərhələdən enum kimi düşünülməlidir:

```txt
NOUN
VERB
ADJECTIVE
ADVERB
PHRASE
IDIOM
PHRASAL_VERB
SENTENCE
```

### Example Sentence

Example sentence vacibdir. Söz kontekstdə daha yaxşı öyrənilir.

Plan:

```txt
ExampleSentence
  vocabularyItemId
  sourceText
  targetText
```

### Pronunciation

Audio faylı database-də saxlanmayacaq.

Plan:

```txt
Pronunciation
  vocabularyItemId
  ipa
  audioUrl
```

Audio gələcəkdə storage-də saxlanacaq:

```txt
S3
Supabase Storage
Cloudflare R2
```

### Difficulty

İki difficulty fərqləndirilməlidir:

```txt
Global difficulty / CEFR level
User-specific difficulty
```

Məsələn:

```txt
VocabularyItem.cefrLevel = A1
UserWord.difficulty = HARD
```

---

## 9. CEFR vs XP Decision

Level sistemi iki ayrı hissə olacaq.

### CEFR Level

Content-in real dil səviyyəsini göstərir:

```txt
A1
A2
B1
B2
C1
C2
```

Bu filter və learning path üçün istifadə olunur.

### XP Level

User-in app içində aktivliyini göstərir.

Məsələn:

```txt
Quiz doğru cavab: +10 XP
Daily goal tamamlandı: +30 XP
7 gün streak: +100 XP
```

Qərar:

```txt
Vocabulary level = CEFR
User level = XP
```

Bu ikisi qarışdırılmamalıdır.

---

## 10. Review System Plan

Review sistemi üçün iki əsas model düşünülür:

```txt
UserWord
ReviewLog
```

### UserWord

User-in konkret sözdəki cari vəziyyəti:

```txt
userId
vocabularyItemId
difficulty
progress
nextReviewAt
lastReviewedAt
timesSeen
timesCorrect
timesWrong
```

### ReviewLog

Tarixçə:

```txt
userId
userWordId
gameType
isCorrect
answer
responseTimeMs
reviewedAt
```

Bu, statistikalar və progress graph üçün vacibdir.

---

## 11. Reminder / Spaced Repetition

MVP-də sadə reminder seçimləri olacaq:

```txt
I know this word
Remind tomorrow
Remind after 1 month
Remind after 1 year
```

Sonradan daha ağıllı spaced repetition algoritmi əlavə oluna bilər.

Queue sistemi:

```txt
Redis
BullMQ
```

Push notification:

```txt
Expo Notifications
```

---

## 12. Games Plan

İlk oyunlar:

```txt
Typing quiz
Multiple choice
Matching
Reverse quiz
```

Bütün oyunlar eyni review engine-ə nəticə göndərməlidir.

Plan endpoint:

```txt
POST /reviews/answer
```

---

## 13. Deck / Collection System

Category və Deck fərqli anlayışlardır.

### Category

Sistem tərəfindən idarə olunan bölmələr:

```txt
Travel
Business
Daily Words
IT
Food
```

### Deck

User və ya community tərəfindən yaradılan collection:

```txt
IELTS beginner words
React interview vocabulary
Norway living words
Airport vocabulary
```

Deck-lər public/private ola bilər və country visibility dəstəkləyə bilər.

---

## 14. Social / Public Feed Plan

Gələcəkdə user sözlərini və deck-lərini public paylaşa biləcək.

Feature-lər:

```txt
Public feed
Posts
Comments
Likes
Follows
Public profile
Reports
Moderation
```

DM sistemi hələlik yoxdur. Gələcəkdə əlavə oluna bilər.

---

## 15. Country / Audience Visibility Decision

Country sistemi 3 fərqli anlayışa bölünür:

### Author Country

Paylaşımı edən user-in ölkəsi.

```txt
authorCountryCode
```

### Audience Scope

Post/deck kimlərə görünür:

```txt
GLOBAL
COUNTRY
SELECTED_COUNTRIES
PRIVATE
```

### Audience Countries

Əgər `SELECTED_COUNTRIES` seçilərsə:

```txt
PostAudienceCountry
DeckAudienceCountry
```

Nümunələr:

```txt
EN -> AZ post, only Azerbaijan
EN -> AZ post, global
AZ -> EN post, visible to Norway users
Norway users sharing AZ -> EN posts
```

GPS location saxlanmamalıdır. User ölkəni özü seçməlidir. Privacy üçün dəqiq location saxlamırıq.

---

## 16. Admin Dashboard Plan

Gələcəkdə ayrıca web dashboard olacaq:

```txt
apps/admin
```

Admin dashboard desktop üçün nəzərdə tutulur.

Admin feature-lər:

```txt
User count
Active users
User country distribution
Language pair usage
Most added words
User activity
Ban / unblock user
Give reward / bonus
Moderate posts
Moderate comments
Handle reports
Analytics
```

Admin role sistemi:

```txt
USER
ADMIN
SUPER_ADMIN
```

Owner user:

```txt
SUPER_ADMIN
```

Gələcək modellər:

```txt
UserModerationAction
UserReward
UserEntitlement
UserActivityEvent
UserSessionAnalytics
```

---

## 17. Analytics Plan

Event-based analytics düşünülür.

Event nümunələri:

```txt
app_opened
session_started
session_ended
word_created
quiz_completed
review_completed
post_created
comment_created
language_pair_changed
```

Gələcək modellər:

```txt
UserActivityEvent
UserSession
```

Privacy qaydası:

* GPS saxlanmır
* Lazımsız şəxsi data göstərilmir
* Analytics product improvement və moderation üçün istifadə olunur

---

## 18. Gamification Plan

Gələcəkdə əlavə olunacaq:

```txt
XP
User level
Daily goal
Streak
Streak freeze
Badges
Rewards
Word of the day
Leaderboard
```

### Streak Freeze

Duolingo kimi bir günlük boşluğu bağışlayan sistem.

### Word of the Day

Language pair və country əsasında ola bilər:

```txt
EN -> AZ global word of the day
RU -> AZ word of the day
AZ country-specific word of the day
```

---

## 19. Near-Term Roadmap

### Current next step

Real login implementation:

```txt
bcrypt.compare
User status check
Access token
Refresh token
AuthSession create
Refresh token hash
Token response mapper
```

### Then

```txt
Refresh endpoint
Logout endpoint
Me endpoint
JWT Guard
Role Guard
Admin guard foundation
```

### Then

```txt
VocabularyItem schema
Word create endpoint
Word list endpoint
My words endpoint
UserWord model
Review system
```

### Then

```txt
Basic game engine
Typing quiz
Multiple choice
ReviewLog
Progress calculation
```

### Then

```txt
Push notification
BullMQ worker
Reminder scheduling
```

### Then

```txt
Decks
Public feed
Comments
Follow
Admin dashboard
Analytics
```

---

## 20. Important Engineering Rules

* Hər böyük dəyişiklikdən sonra commit edilməlidir
* Hər migration-dan sonra `prisma generate` edilməlidir
* `.env` commit olunmamalıdır
* `.env.example` update olunmalıdır
* Password və token plain saxlanmamalıdır
* Service-lərdə `process.env` istifadə olunmamalıdır
* Repository-lər transaction/nested write məsələlərində diqqətli olmalıdır
* Response shape mapper-lərdə saxlanmalıdır
* Test etmədən commit edilməməlidir
* Hər yeni feature üçün əvvəl model və use-case düşünülməlidir

- Repository method-larında lazımsız `async/await` istifadə olunmamalıdır.
- Sadə Prisma query method-ları birbaşa `return this.prisma...` ilə Promise qaytarmalıdır.
- `async/await` yalnız əlavə logic, transaction, try/catch və ya result transform lazımdırsa istifadə olunmalıdır.
- Service layer use-case flow idarə etdiyi üçün orada `await` istifadə etmək normaldır.

---

## 21. Current Ports

API port:

```txt
4000
```

Docker services:

```txt
PostgreSQL: 5432
Redis: 6379
```

---

## 22. Current Useful Commands

Start backend:

```powershell
pnpm api:dev
```

Docker up:

```powershell
pnpm docker:up
```

Docker down:

```powershell
pnpm docker:down
```

Prisma migration:

```powershell
pnpm --filter @word-app/api exec prisma migrate dev --name migration_name
```

Prisma generate:

```powershell
pnpm --filter @word-app/api exec prisma generate
```

Prisma Studio:

```powershell
pnpm --filter @word-app/api exec prisma studio
```

Seed:

```powershell
pnpm --filter @word-app/api exec tsx prisma/seed.ts
```

---

## 23. Current API Endpoints

```txt
GET  /countries
GET  /languages
GET  /language-pairs
POST /auth/register
POST /auth/login
```

Note:

`POST /auth/login` hələ real implement olunmayıb. Növbəti mərhələdə implement ediləcək.

---

## 24. Final Direction

Layihə mərhələli inkişaf etdiriləcək. Hər feature production-ready yanaşma ilə yazılacaq, amma MVP-ni ağırlaşdırmamaq üçün social, analytics və admin dashboard kimi böyük hissələr doğru vaxta saxlanacaq.

Əsas prinsip:

```txt
Əvvəl sağlam foundation.
Sonra core learning loop.
Sonra social/community.
Sonra analytics/admin/premium.
```
### 2026-06-08

#### Decisions

* Repository method-ları universal və şişmiş formada yazılmayacaq.
* Hər repository method-u konkret use-case üçün lazım olan minimum datanı çəkməlidir.
* Register zamanı email duplicate check üçün yalnız `User.id` kifayətdir.
* Login üçün ayrıca `findUserForAuth` method-u olacaq.
* Login zamanı `languagePairs` array-i çəkilməyəcək, çünki aktiv language pair `UserProfile.activeLanguagePairId` içində saxlanır.
* `AuthSession` yaradıldıqdan sonra caller-ə yalnız lazım olan minimal field-lər qaytarılacaq.

#### Changes

* Previous: `findUserByEmail` həm register, həm login üçün istifadə edilə biləcək formada `profile` və `languagePairs` ilə data çəkirdi.

* New: `findUserByEmail` yalnız duplicate email check üçün minimal `select: { id: true }` qaytaracaq.

* Reason: Register flow-da profile və languagePairs lazım deyil. Lazımsız data çəkmək DB yükünü artırır və repository method-un məsuliyyətini şişirdir.

* Previous: Login üçün ayrıca repository method-u yox idi.

* New: Login üçün `findUserForAuth(email)` yaradılacaq və yalnız login üçün lazım olan data qaytaracaq: user auth fields + profile.

* Reason: Hər use-case öz ehtiyacı qədər data almalıdır.

* Previous: `createAuthSession` bütün session field-lərini qaytara bilərdi.

* New: `createAuthSession` yalnız `id`, `userId`, `expiresAt` qaytaracaq.

* Reason: `refreshTokenHash`, `ipAddress`, `userAgent` kimi field-lər service response flow-a qarışmamalıdır.

#### Engineering Rule Added

* Repository layer-də default olaraq `include: true` və ya lazımsız relation-lar istifadə olunmamalıdır.
* Hər query üçün “bu field həqiqətən lazımdırmı?” yoxlanmalıdır.
* Mapper type-ları da yalnız istifadə etdiyi relation-ları tələb etməlidir.

#### Next Steps

* `auth.repository.ts` minimal query prinsipinə uyğun yenilə.
* `auth.mapper.ts` içindən `languagePairs` dependency-ni çıxar.
* `AuthTokenService`-i constructor-level config cache və HMAC-SHA256 refresh token hash ilə final formaya sal.
* Sonra `AuthService.login` real implementasiyasına keç.
