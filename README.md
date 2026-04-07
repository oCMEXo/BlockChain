# Hardhat Smart Contract Project

> Развертывание и взаимодействие со смарт-контрактами на сети **Base Sepolia** с использованием Hardhat.

---

## Контракты

### `Greeter.sol`
Принимает имя при деплое и возвращает приветствие через функцию `greet()`.

```
greet() → "Hello, <name>!"
```

### `Lock.sol`
Блокирует ETH до заданного времени. Только владелец может вывести средства после истечения срока через `withdraw()`.

---

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

```bash
cp example.env .env
```

Откройте `.env` и вставьте приватный ключ кошелька:

```env
PRIVATE_KEY=ваш_приватный_ключ_без_0x
```

> **Важно:** файл `.env` добавлен в `.gitignore` — никогда не коммитьте его в репозиторий.

### 3. Компиляция

```bash
npm run compile
```

### 4. Деплой

```bash
# Задеплоить контракт Lock
npm run deploy:lock

# Задеплоить контракт Greeter
npm run deploy:greeter
```

После деплоя Greeter скопируйте адрес контракта в `scripts/interact.js`.

### 5. Взаимодействие

```bash
npm run interact
```

---

## Структура проекта

```
hardhat-clean/
├── contracts/
│   ├── Greeter.sol       # Контракт приветствия
│   └── Lock.sol          # Контракт блокировки ETH
├── scripts/
│   ├── deployGreeter.js  # Скрипт деплоя Greeter
│   ├── deployLock.js     # Скрипт деплоя Lock
│   └── interact.js       # Скрипт взаимодействия
├── hardhat.config.js     # Конфигурация Hardhat
├── example.env           # Пример переменных окружения
└── package.json
```

---

## Требования

| Инструмент | Версия |
|------------|--------|
| Node.js    | >= 16  |
| Hardhat    | ^2.22  |
| ethers.js  | ^6.4   |

Для деплоя нужен кошелёк с ETH на **Base Sepolia** для оплаты газа.  
Получить тестовые ETH можно на [faucet.quicknode.com](https://faucet.quicknode.com/base/sepolia).

---

## Лицензия

Проект создан в образовательных целях.
