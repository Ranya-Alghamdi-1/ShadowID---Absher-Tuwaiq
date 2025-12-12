# Database Seeding Scripts

This directory contains scripts to populate the database with realistic seed data.

## Available Scripts

### Seed All Data

```bash
npm run seed:all
```

Runs all seed scripts in order:

1. Services and Portals
2. Users

### Individual Seed Scripts

#### Seed Services and Portals

```bash
npm run seed:services
```

Creates:

- 10+ services (banks, government, healthcare, utilities, etc.)
- 40+ portals across all Saudi regions
- Each service gets a unique API key

#### Seed Users

```bash
npm run seed:users
```

Creates:

- 20 realistic users (10 Citizens, 10 Residents)
- Users with realistic statistics (totalIdsGenerated, totalVerified, activeDays)
- Random last login dates within the last 7 days

## Features

- **Idempotent**: All scripts use upsert logic - safe to run multiple times
- **Realistic Data**: Saudi names, phone numbers, locations
- **Comprehensive Coverage**: Services and portals across all major Saudi regions

## Services Included

1. **وزارة الداخلية** (Ministry of Interior) - Government
2. **البنك الأهلي** (Al Ahli Bank) - Banking
3. **بنك الرياض** (Riyad Bank) - Banking
4. **مستشفى الملك فيصل** (King Faisal Specialist Hospital) - Healthcare
5. **وزارة الصحة** (Ministry of Health) - Healthcare
6. **جامعة الملك سعود** (King Saud University) - Education
7. **وزارة التعليم** (Ministry of Education) - Education
8. **هيئة الزكاة والضريبة** (Zakat and Tax Authority) - Government
9. **شركة الكهرباء** (Saudi Electricity Company) - Utilities
10. **الاتصالات السعودية** (STC) - Telecommunications
11. **سابك** (SABIC) - Industrial

## Regions Covered

- الرياض (Riyadh)
- جدة (Jeddah)
- الدمام (Dammam)
- مكة المكرمة (Makkah)
- المدينة المنورة (Madinah)
- الطائف (Taif)
- تبوك (Tabuk)
- أبها (Abha)
- حائل (Hail)
- الجبيل (Jubail)
- And more...

## Usage

1. **First time setup:**

   ```bash
   npm run seed:all
   ```

2. **Update existing data:**

   ```bash
   npm run seed:all  # Safe to run again - uses upsert
   ```

3. **Add more services:**
   Edit `seed-services.ts` and add to the `servicesData` array, then run:

   ```bash
   npm run seed:services
   ```

## Notes

- All scripts automatically connect to the database
- Scripts exit cleanly after completion
- Check console output for created/updated counts
- API keys are generated automatically for each service
