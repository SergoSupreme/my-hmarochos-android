«Мій Хмарочос» — Android-застосунок із пуш-сповіщеннями (Firebase)
==================================================================

Що тут:
  app/                      — код застосунку (обгортка гри + сповіщення Firebase)
  app/google-services.json  — налаштування твого проєкту Firebase (my-hmarochos)
  signing/                  — КЛЮЧ ПІДПИСУ і пароль. НІКОМУ не передавай і НЕ завантажуй на GitHub!
                              Без цього ключа оновлення не встановиться поверх старої версії гри.
  .github/workflows/build.yml — автоматична збірка APK на GitHub

СПОСІБ А — GitHub (збирає сам, нічого не встановлюєш)
  1. Створи на github.com ПРИВАТНИЙ репозиторій (наприклад, my-hmarochos-android).
  2. Завантаж туди всі файли з цієї папки, КРІМ папки signing (вона в .gitignore).
  3. У репозиторії: Settings → Secrets and variables → Actions → New repository secret:
       KEYSTORE_BASE64 = весь вміст файлу signing/KEYSTORE_BASE64.txt
       KS_PASS         = пароль із файлу signing/keystore-password.txt
  4. Вкладка Actions → «Збірка APK» → Run workflow. Через 3–5 хвилин унизу сторінки запуску
     з'явиться MyHmarochos-apk — це готовий APK (у zip-архіві).
  Або підключи GitHub до Claude — тоді збирати й надсилати APK буду я.

СПОСІБ Б — Android Studio
  1. Встанови Android Studio (безкоштовно) і відкрий цю папку (File → Open).
  2. Дочекайся завершення Gradle Sync.
  3. Build → Generate Signed App Bundle / APK → APK →
       Key store path: signing/hmarochos-release.jks, alias: hmarochos,
       паролі: із signing/keystore-password.txt → release → Create.
  4. Готовий файл: app/release/app-release.apk

Після встановлення нової версії гра попросить дозвіл на сповіщення (Android 13+).
У налаштуваннях гри з'явиться розділ «Пуш-сповіщення».
