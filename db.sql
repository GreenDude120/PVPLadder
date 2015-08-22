CREATE TABLE `events` (
    `eventid`TEXT NOT NULL,
    `season`INTEGER NOT NULL,
    `startdate`INTEGER,
    `enddate`INTEGER,
    `fetched`INTEGER,
    PRIMARY KEY(eventid)
);
CREATE TABLE `eventranking` (
    `pseudopk`INTEGER PRIMARY KEY AUTOINCREMENT,
    `accountname`TEXT,
    `charactername`TEXT,
    `class`TEXT,
    `points`INTEGER,
    `event`TEXT
);
CREATE TABLE `accountranking` (
    `account`TEXT,
    `points`INTEGER,
    PRIMARY KEY(account)
);
