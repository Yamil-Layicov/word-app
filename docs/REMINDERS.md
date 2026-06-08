# Reminders

Bu faylda hazırda etmədiyimiz, amma gələcəkdə geri qayıdacağımız texniki və product xatırlatmaları saxlanılır.

## 1. Auth Session Audit Fields

Refresh endpoint hazırda `userAgent` və `ipAddress` context almır.

Gələcəkdə `AuthSession` modelinə audit field-lər əlavə olunmalıdır:

* `lastUsedAt`
* `lastUserAgent`
* `lastIpAddress`

Refresh token rotation zamanı bu field-lər yenilənməlidir.

## 2. Refresh Endpoint Request Context

`POST /auth/refresh` gələcəkdə login kimi request context qəbul etməlidir:

* `userAgent`
* `ipAddress`

Bu məlumatlar security audit və session monitoring üçün istifadə olunacaq.

## 3. Production Trust Proxy

Local development üçün:

```env
TRUST_PROXY=0
```

Production-da app Nginx, load balancer və ya reverse proxy arxasında olarsa:

```env
TRUST_PROXY=1
```

Deployment zamanı real infrastructure-a görə `trust proxy` yenidən yoxlanmalıdır.

## 4. Login Timing Hardening

Hazırda user tapılmadıqda bcrypt compare işləmir.

Gələcəkdə email enumeration timing riskini azaltmaq üçün user tapılmadıqda dummy bcrypt hash ilə compare etmək olar.

Məqsəd:

* Mövcud olmayan email
* Mövcud email + səhv password

hər ikisi daha oxşar response time versin.

## 5. Auth Rate Limiting

Login, register və refresh endpoint-ləri üçün rate limit əlavə olunmalıdır.

Prioritet endpoint-lər:

* `POST /auth/login`
* `POST /auth/register`
* `POST /auth/refresh`

Məqsəd:

* brute force riskini azaltmaq
* spam register-in qarşısını almaq
* refresh endpoint abuse-un qarşısını almaq

## 6. Refresh Token Reuse Detection

Hazırda köhnə refresh token rotation-dan sonra yenidən istifadə olunarsa `401 Invalid refresh token` qaytarılır.

Gələcəkdə daha sərt security üçün reuse detection əlavə oluna bilər:

* köhnə refresh token istifadə olunarsa session revoke edilsin
* ehtiyac olarsa user-in bütün session-ları revoke edilsin
* suspicious activity log yaradılsın

## 7. Auth Tests

Auth module üçün testlər əlavə olunmalıdır:

* register success
* duplicate email
* invalid language pair
* login success
* wrong password
* unknown email
* blocked user
* refresh success
* refresh token rotation
* old refresh token reuse
* revoked session refresh
* expired session refresh

## 8. Environment Naming Cleanup

Refresh token artıq JWT deyil, opaque token-dir.

Gələcəkdə config adı daha aydın edilə bilər:

Current:

```env
JWT_REFRESH_EXPIRES_IN="7d"
```

Possible future rename:

```env
REFRESH_TOKEN_EXPIRES_IN="7d"
```

Bu dəyişiklik edilərsə `.env`, `.env.example` və `AuthTokenService` birlikdə yenilənməlidir.
