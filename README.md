# Substance Notes [![Build Status](https://travis-ci.org/substance/notes.svg?branch=master)](https://travis-ci.org/substance/notes)

Real-time collaborative notes editing.

# Install

Install dependencies

```bash
npm install
```

Seed the db

```bash
npm run seed
```

Start the app

```bash
npm start
```

To login with the test user:

```bash
http://localhost:5000/#loginKey=1234
```

List of optional environment variables
- HOST
- PORT
- WS_URL (url of websocket server)
- MAIL_SENDER (email notifications from field)
- MAILGUN_USER
- MAILGUN_PASS