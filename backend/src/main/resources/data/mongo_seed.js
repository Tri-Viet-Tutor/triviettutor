// Seed LiveKit audit logs into MongoDB
var dbName = 'triviettutor';
var targetDb = (typeof db !== 'undefined') ? db.getSiblingDB(dbName) : (new Mongo()).getDB(dbName);

const sessionLogs = [
  {
    "sessionId": "classroom-session-100",
    "roomName": "classroom-session-100",
    "classGroupId": 2,
    "scheduleId": 100,
    "hostUserId": 25,
    "startTime": "2026-11-05T08:00:00Z",
    "endTime": null,
    "durationSeconds": 1800,
    "status": "ACTIVE",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-101",
    "roomName": "classroom-session-101",
    "classGroupId": 3,
    "scheduleId": 101,
    "hostUserId": 26,
    "startTime": "2026-11-05T14:00:00Z",
    "endTime": null,
    "durationSeconds": 1800,
    "status": "ACTIVE",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-102",
    "roomName": "classroom-session-102",
    "classGroupId": 4,
    "scheduleId": 102,
    "hostUserId": 27,
    "startTime": "2026-11-05T18:00:00Z",
    "endTime": null,
    "durationSeconds": 1800,
    "status": "ACTIVE",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-103",
    "roomName": "classroom-session-103",
    "classGroupId": 5,
    "scheduleId": 103,
    "hostUserId": 31,
    "startTime": "2026-11-05T20:00:00Z",
    "endTime": null,
    "durationSeconds": 1800,
    "status": "ACTIVE",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-104",
    "roomName": "classroom-session-104",
    "classGroupId": 6,
    "scheduleId": 104,
    "hostUserId": 32,
    "startTime": "2026-11-05T08:00:00Z",
    "endTime": null,
    "durationSeconds": 1800,
    "status": "ACTIVE",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-105",
    "roomName": "classroom-session-105",
    "classGroupId": 7,
    "scheduleId": 105,
    "hostUserId": 25,
    "startTime": "2026-11-05T14:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-106",
    "roomName": "classroom-session-106",
    "classGroupId": 8,
    "scheduleId": 106,
    "hostUserId": 26,
    "startTime": "2026-11-05T18:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-107",
    "roomName": "classroom-session-107",
    "classGroupId": 9,
    "scheduleId": 107,
    "hostUserId": 27,
    "startTime": "2026-11-05T20:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-108",
    "roomName": "classroom-session-108",
    "classGroupId": 10,
    "scheduleId": 108,
    "hostUserId": 31,
    "startTime": "2026-11-05T08:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-109",
    "roomName": "classroom-session-109",
    "classGroupId": 11,
    "scheduleId": 109,
    "hostUserId": 32,
    "startTime": "2026-11-05T14:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-110",
    "roomName": "classroom-session-110",
    "classGroupId": 14,
    "scheduleId": 110,
    "hostUserId": 25,
    "startTime": "2026-11-05T18:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-111",
    "roomName": "classroom-session-111",
    "classGroupId": 20,
    "scheduleId": 111,
    "hostUserId": 26,
    "startTime": "2026-11-05T20:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-112",
    "roomName": "classroom-session-112",
    "classGroupId": 21,
    "scheduleId": 112,
    "hostUserId": 27,
    "startTime": "2026-11-05T08:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-113",
    "roomName": "classroom-session-113",
    "classGroupId": 22,
    "scheduleId": 113,
    "hostUserId": 31,
    "startTime": "2026-11-05T14:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-114",
    "roomName": "classroom-session-114",
    "classGroupId": 23,
    "scheduleId": 114,
    "hostUserId": 32,
    "startTime": "2026-11-05T18:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-115",
    "roomName": "classroom-session-115",
    "classGroupId": 24,
    "scheduleId": 115,
    "hostUserId": 25,
    "startTime": "2026-11-03T20:00:00Z",
    "endTime": "2026-11-03T22:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-116",
    "roomName": "classroom-session-116",
    "classGroupId": 2,
    "scheduleId": 116,
    "hostUserId": 26,
    "startTime": "2026-11-01T08:00:00Z",
    "endTime": "2026-11-01T10:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-117",
    "roomName": "classroom-session-117",
    "classGroupId": 3,
    "scheduleId": 117,
    "hostUserId": 27,
    "startTime": "2026-10-30T14:00:00Z",
    "endTime": "2026-10-30T16:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-118",
    "roomName": "classroom-session-118",
    "classGroupId": 4,
    "scheduleId": 118,
    "hostUserId": 31,
    "startTime": "2026-10-28T18:00:00Z",
    "endTime": "2026-10-28T20:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-119",
    "roomName": "classroom-session-119",
    "classGroupId": 5,
    "scheduleId": 119,
    "hostUserId": 32,
    "startTime": "2026-10-26T20:00:00Z",
    "endTime": "2026-10-26T22:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-120",
    "roomName": "classroom-session-120",
    "classGroupId": 6,
    "scheduleId": 120,
    "hostUserId": 25,
    "startTime": "2026-10-24T08:00:00Z",
    "endTime": "2026-10-24T10:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-121",
    "roomName": "classroom-session-121",
    "classGroupId": 7,
    "scheduleId": 121,
    "hostUserId": 26,
    "startTime": "2026-10-22T14:00:00Z",
    "endTime": "2026-10-22T16:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-122",
    "roomName": "classroom-session-122",
    "classGroupId": 8,
    "scheduleId": 122,
    "hostUserId": 27,
    "startTime": "2026-10-20T18:00:00Z",
    "endTime": "2026-10-20T20:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-123",
    "roomName": "classroom-session-123",
    "classGroupId": 9,
    "scheduleId": 123,
    "hostUserId": 31,
    "startTime": "2026-10-18T20:00:00Z",
    "endTime": "2026-10-18T22:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-124",
    "roomName": "classroom-session-124",
    "classGroupId": 10,
    "scheduleId": 124,
    "hostUserId": 32,
    "startTime": "2026-10-16T08:00:00Z",
    "endTime": "2026-10-16T10:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-125",
    "roomName": "classroom-session-125",
    "classGroupId": 11,
    "scheduleId": 125,
    "hostUserId": 25,
    "startTime": "2026-10-14T14:00:00Z",
    "endTime": "2026-10-14T16:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-126",
    "roomName": "classroom-session-126",
    "classGroupId": 14,
    "scheduleId": 126,
    "hostUserId": 26,
    "startTime": "2026-10-12T18:00:00Z",
    "endTime": "2026-10-12T20:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-127",
    "roomName": "classroom-session-127",
    "classGroupId": 20,
    "scheduleId": 127,
    "hostUserId": 27,
    "startTime": "2026-10-10T20:00:00Z",
    "endTime": "2026-10-10T22:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-128",
    "roomName": "classroom-session-128",
    "classGroupId": 21,
    "scheduleId": 128,
    "hostUserId": 31,
    "startTime": "2026-10-08T08:00:00Z",
    "endTime": "2026-10-08T10:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-129",
    "roomName": "classroom-session-129",
    "classGroupId": 22,
    "scheduleId": 129,
    "hostUserId": 32,
    "startTime": "2026-10-06T14:00:00Z",
    "endTime": "2026-10-06T16:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-130",
    "roomName": "classroom-session-130",
    "classGroupId": 23,
    "scheduleId": 130,
    "hostUserId": 25,
    "startTime": "2026-10-04T18:00:00Z",
    "endTime": "2026-10-04T20:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-131",
    "roomName": "classroom-session-131",
    "classGroupId": 24,
    "scheduleId": 131,
    "hostUserId": 26,
    "startTime": "2026-10-02T20:00:00Z",
    "endTime": "2026-10-02T22:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-132",
    "roomName": "classroom-session-132",
    "classGroupId": 2,
    "scheduleId": 132,
    "hostUserId": 27,
    "startTime": "2026-09-30T08:00:00Z",
    "endTime": "2026-09-30T10:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-133",
    "roomName": "classroom-session-133",
    "classGroupId": 3,
    "scheduleId": 133,
    "hostUserId": 31,
    "startTime": "2026-09-28T14:00:00Z",
    "endTime": "2026-09-28T16:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-134",
    "roomName": "classroom-session-134",
    "classGroupId": 4,
    "scheduleId": 134,
    "hostUserId": 32,
    "startTime": "2026-09-26T18:00:00Z",
    "endTime": "2026-09-26T20:00:00Z",
    "durationSeconds": 7200,
    "status": "COMPLETED",
    "totalParticipantsCount": 5,
    "maxParticipants": 6
  },
  {
    "sessionId": "classroom-session-135",
    "roomName": "classroom-session-135",
    "classGroupId": 5,
    "scheduleId": 135,
    "hostUserId": 25,
    "startTime": "2026-11-07T20:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-136",
    "roomName": "classroom-session-136",
    "classGroupId": 6,
    "scheduleId": 136,
    "hostUserId": 26,
    "startTime": "2026-11-09T08:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-137",
    "roomName": "classroom-session-137",
    "classGroupId": 7,
    "scheduleId": 137,
    "hostUserId": 27,
    "startTime": "2026-11-11T14:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-138",
    "roomName": "classroom-session-138",
    "classGroupId": 8,
    "scheduleId": 138,
    "hostUserId": 31,
    "startTime": "2026-11-13T18:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-139",
    "roomName": "classroom-session-139",
    "classGroupId": 9,
    "scheduleId": 139,
    "hostUserId": 32,
    "startTime": "2026-11-15T20:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-140",
    "roomName": "classroom-session-140",
    "classGroupId": 10,
    "scheduleId": 140,
    "hostUserId": 25,
    "startTime": "2026-11-17T08:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-141",
    "roomName": "classroom-session-141",
    "classGroupId": 11,
    "scheduleId": 141,
    "hostUserId": 26,
    "startTime": "2026-11-19T14:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-142",
    "roomName": "classroom-session-142",
    "classGroupId": 14,
    "scheduleId": 142,
    "hostUserId": 27,
    "startTime": "2026-11-21T18:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-143",
    "roomName": "classroom-session-143",
    "classGroupId": 20,
    "scheduleId": 143,
    "hostUserId": 31,
    "startTime": "2026-11-23T20:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-144",
    "roomName": "classroom-session-144",
    "classGroupId": 21,
    "scheduleId": 144,
    "hostUserId": 32,
    "startTime": "2026-11-25T08:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-145",
    "roomName": "classroom-session-145",
    "classGroupId": 22,
    "scheduleId": 145,
    "hostUserId": 25,
    "startTime": "2026-11-27T14:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-146",
    "roomName": "classroom-session-146",
    "classGroupId": 23,
    "scheduleId": 146,
    "hostUserId": 26,
    "startTime": "2026-11-29T18:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-147",
    "roomName": "classroom-session-147",
    "classGroupId": 24,
    "scheduleId": 147,
    "hostUserId": 27,
    "startTime": "2026-12-01T20:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-148",
    "roomName": "classroom-session-148",
    "classGroupId": 2,
    "scheduleId": 148,
    "hostUserId": 31,
    "startTime": "2026-12-03T08:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  },
  {
    "sessionId": "classroom-session-149",
    "roomName": "classroom-session-149",
    "classGroupId": 3,
    "scheduleId": 149,
    "hostUserId": 32,
    "startTime": "2026-12-05T14:00:00Z",
    "endTime": null,
    "durationSeconds": 0,
    "status": "SCHEDULED",
    "totalParticipantsCount": 0,
    "maxParticipants": 0
  }
];
const participantLogs = [
  {
    "sessionId": "classroom-session-100",
    "roomName": "classroom-session-100",
    "userId": 25,
    "userRole": "TUTOR",
    "participantIdentity": "25",
    "participantName": "Gia Sư #25 (Gia sư)",
    "joinedAt": "2026-11-05T08:00:00Z",
    "leftAt": null,
    "durationSeconds": 1800,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "name": "Gia Sư #25"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_100_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_VID_100_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-100",
    "roomName": "classroom-session-100",
    "userId": 13,
    "userRole": "STUDENT",
    "participantIdentity": "13",
    "participantName": "Học Viên #13 (Học sinh)",
    "joinedAt": "2026-11-05T08:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "name": "Học Viên #13"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_100_S13"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-100",
    "roomName": "classroom-session-100",
    "userId": 22,
    "userRole": "STUDENT",
    "participantIdentity": "22",
    "participantName": "Học Viên #22 (Học sinh)",
    "joinedAt": "2026-11-05T08:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "name": "Học Viên #22"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_100_S22"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-100",
    "roomName": "classroom-session-100",
    "userId": 23,
    "userRole": "STUDENT",
    "participantIdentity": "23",
    "participantName": "Học Viên #23 (Học sinh)",
    "joinedAt": "2026-11-05T08:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "name": "Học Viên #23"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_100_S23"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-101",
    "roomName": "classroom-session-101",
    "userId": 26,
    "userRole": "TUTOR",
    "participantIdentity": "26",
    "participantName": "Gia Sư #26 (Gia sư)",
    "joinedAt": "2026-11-05T14:00:00Z",
    "leftAt": null,
    "durationSeconds": 1800,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T14:00:00Z",
        "details": {
          "name": "Gia Sư #26"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_101_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-11-05T14:00:00Z",
        "details": {
          "trackSid": "TR_VID_101_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-101",
    "roomName": "classroom-session-101",
    "userId": 22,
    "userRole": "STUDENT",
    "participantIdentity": "22",
    "participantName": "Học Viên #22 (Học sinh)",
    "joinedAt": "2026-11-05T14:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T14:00:00Z",
        "details": {
          "name": "Học Viên #22"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_101_S22"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-101",
    "roomName": "classroom-session-101",
    "userId": 23,
    "userRole": "STUDENT",
    "participantIdentity": "23",
    "participantName": "Học Viên #23 (Học sinh)",
    "joinedAt": "2026-11-05T14:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T14:00:00Z",
        "details": {
          "name": "Học Viên #23"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_101_S23"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-101",
    "roomName": "classroom-session-101",
    "userId": 24,
    "userRole": "STUDENT",
    "participantIdentity": "24",
    "participantName": "Học Viên #24 (Học sinh)",
    "joinedAt": "2026-11-05T14:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T14:00:00Z",
        "details": {
          "name": "Học Viên #24"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_101_S24"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-102",
    "roomName": "classroom-session-102",
    "userId": 27,
    "userRole": "TUTOR",
    "participantIdentity": "27",
    "participantName": "Gia Sư #27 (Gia sư)",
    "joinedAt": "2026-11-05T18:00:00Z",
    "leftAt": null,
    "durationSeconds": 1800,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T18:00:00Z",
        "details": {
          "name": "Gia Sư #27"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_102_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-11-05T18:00:00Z",
        "details": {
          "trackSid": "TR_VID_102_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-102",
    "roomName": "classroom-session-102",
    "userId": 23,
    "userRole": "STUDENT",
    "participantIdentity": "23",
    "participantName": "Học Viên #23 (Học sinh)",
    "joinedAt": "2026-11-05T18:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T18:00:00Z",
        "details": {
          "name": "Học Viên #23"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_102_S23"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-102",
    "roomName": "classroom-session-102",
    "userId": 24,
    "userRole": "STUDENT",
    "participantIdentity": "24",
    "participantName": "Học Viên #24 (Học sinh)",
    "joinedAt": "2026-11-05T18:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T18:00:00Z",
        "details": {
          "name": "Học Viên #24"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_102_S24"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-102",
    "roomName": "classroom-session-102",
    "userId": 33,
    "userRole": "STUDENT",
    "participantIdentity": "33",
    "participantName": "Học Viên #33 (Học sinh)",
    "joinedAt": "2026-11-05T18:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T18:00:00Z",
        "details": {
          "name": "Học Viên #33"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_102_S33"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-103",
    "roomName": "classroom-session-103",
    "userId": 31,
    "userRole": "TUTOR",
    "participantIdentity": "31",
    "participantName": "Gia Sư #31 (Gia sư)",
    "joinedAt": "2026-11-05T20:00:00Z",
    "leftAt": null,
    "durationSeconds": 1800,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T20:00:00Z",
        "details": {
          "name": "Gia Sư #31"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_103_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-11-05T20:00:00Z",
        "details": {
          "trackSid": "TR_VID_103_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-103",
    "roomName": "classroom-session-103",
    "userId": 24,
    "userRole": "STUDENT",
    "participantIdentity": "24",
    "participantName": "Học Viên #24 (Học sinh)",
    "joinedAt": "2026-11-05T20:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T20:00:00Z",
        "details": {
          "name": "Học Viên #24"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_103_S24"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-103",
    "roomName": "classroom-session-103",
    "userId": 33,
    "userRole": "STUDENT",
    "participantIdentity": "33",
    "participantName": "Học Viên #33 (Học sinh)",
    "joinedAt": "2026-11-05T20:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T20:00:00Z",
        "details": {
          "name": "Học Viên #33"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_103_S33"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-103",
    "roomName": "classroom-session-103",
    "userId": 34,
    "userRole": "STUDENT",
    "participantIdentity": "34",
    "participantName": "Học Viên #34 (Học sinh)",
    "joinedAt": "2026-11-05T20:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T20:00:00Z",
        "details": {
          "name": "Học Viên #34"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_103_S34"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-104",
    "roomName": "classroom-session-104",
    "userId": 32,
    "userRole": "TUTOR",
    "participantIdentity": "32",
    "participantName": "Gia Sư #32 (Gia sư)",
    "joinedAt": "2026-11-05T08:00:00Z",
    "leftAt": null,
    "durationSeconds": 1800,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "name": "Gia Sư #32"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_104_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_VID_104_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-104",
    "roomName": "classroom-session-104",
    "userId": 33,
    "userRole": "STUDENT",
    "participantIdentity": "33",
    "participantName": "Học Viên #33 (Học sinh)",
    "joinedAt": "2026-11-05T08:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "name": "Học Viên #33"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_104_S33"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-104",
    "roomName": "classroom-session-104",
    "userId": 34,
    "userRole": "STUDENT",
    "participantIdentity": "34",
    "participantName": "Học Viên #34 (Học sinh)",
    "joinedAt": "2026-11-05T08:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "name": "Học Viên #34"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_104_S34"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-104",
    "roomName": "classroom-session-104",
    "userId": 35,
    "userRole": "STUDENT",
    "participantIdentity": "35",
    "participantName": "Học Viên #35 (Học sinh)",
    "joinedAt": "2026-11-05T08:00:00Z",
    "leftAt": null,
    "durationSeconds": 1680,
    "disconnectReason": null,
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "name": "Học Viên #35"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-05T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_104_S35"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-115",
    "roomName": "classroom-session-115",
    "userId": 25,
    "userRole": "TUTOR",
    "participantIdentity": "25",
    "participantName": "Gia Sư #25 (Gia sư)",
    "joinedAt": "2026-11-03T20:00:00Z",
    "leftAt": "2026-11-03T22:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-03T20:00:00Z",
        "details": {
          "name": "Gia Sư #25"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-03T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_115_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-11-03T20:00:00Z",
        "details": {
          "trackSid": "TR_VID_115_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-115",
    "roomName": "classroom-session-115",
    "userId": 24,
    "userRole": "STUDENT",
    "participantIdentity": "24",
    "participantName": "Học Viên #24 (Học sinh)",
    "joinedAt": "2026-11-03T20:00:00Z",
    "leftAt": "2026-11-03T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-03T20:00:00Z",
        "details": {
          "name": "Học Viên #24"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-03T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_115_S24"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-115",
    "roomName": "classroom-session-115",
    "userId": 33,
    "userRole": "STUDENT",
    "participantIdentity": "33",
    "participantName": "Học Viên #33 (Học sinh)",
    "joinedAt": "2026-11-03T20:00:00Z",
    "leftAt": "2026-11-03T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-03T20:00:00Z",
        "details": {
          "name": "Học Viên #33"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-03T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_115_S33"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-115",
    "roomName": "classroom-session-115",
    "userId": 34,
    "userRole": "STUDENT",
    "participantIdentity": "34",
    "participantName": "Học Viên #34 (Học sinh)",
    "joinedAt": "2026-11-03T20:00:00Z",
    "leftAt": "2026-11-03T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-03T20:00:00Z",
        "details": {
          "name": "Học Viên #34"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-03T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_115_S34"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-116",
    "roomName": "classroom-session-116",
    "userId": 26,
    "userRole": "TUTOR",
    "participantIdentity": "26",
    "participantName": "Gia Sư #26 (Gia sư)",
    "joinedAt": "2026-11-01T08:00:00Z",
    "leftAt": "2026-11-01T10:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-01T08:00:00Z",
        "details": {
          "name": "Gia Sư #26"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-01T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_116_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-11-01T08:00:00Z",
        "details": {
          "trackSid": "TR_VID_116_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-116",
    "roomName": "classroom-session-116",
    "userId": 33,
    "userRole": "STUDENT",
    "participantIdentity": "33",
    "participantName": "Học Viên #33 (Học sinh)",
    "joinedAt": "2026-11-01T08:00:00Z",
    "leftAt": "2026-11-01T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-01T08:00:00Z",
        "details": {
          "name": "Học Viên #33"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-01T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_116_S33"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-116",
    "roomName": "classroom-session-116",
    "userId": 34,
    "userRole": "STUDENT",
    "participantIdentity": "34",
    "participantName": "Học Viên #34 (Học sinh)",
    "joinedAt": "2026-11-01T08:00:00Z",
    "leftAt": "2026-11-01T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-01T08:00:00Z",
        "details": {
          "name": "Học Viên #34"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-01T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_116_S34"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-116",
    "roomName": "classroom-session-116",
    "userId": 35,
    "userRole": "STUDENT",
    "participantIdentity": "35",
    "participantName": "Học Viên #35 (Học sinh)",
    "joinedAt": "2026-11-01T08:00:00Z",
    "leftAt": "2026-11-01T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-11-01T08:00:00Z",
        "details": {
          "name": "Học Viên #35"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-11-01T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_116_S35"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-117",
    "roomName": "classroom-session-117",
    "userId": 27,
    "userRole": "TUTOR",
    "participantIdentity": "27",
    "participantName": "Gia Sư #27 (Gia sư)",
    "joinedAt": "2026-10-30T14:00:00Z",
    "leftAt": "2026-10-30T16:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-30T14:00:00Z",
        "details": {
          "name": "Gia Sư #27"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-30T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_117_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-30T14:00:00Z",
        "details": {
          "trackSid": "TR_VID_117_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-117",
    "roomName": "classroom-session-117",
    "userId": 34,
    "userRole": "STUDENT",
    "participantIdentity": "34",
    "participantName": "Học Viên #34 (Học sinh)",
    "joinedAt": "2026-10-30T14:00:00Z",
    "leftAt": "2026-10-30T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-30T14:00:00Z",
        "details": {
          "name": "Học Viên #34"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-30T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_117_S34"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-117",
    "roomName": "classroom-session-117",
    "userId": 35,
    "userRole": "STUDENT",
    "participantIdentity": "35",
    "participantName": "Học Viên #35 (Học sinh)",
    "joinedAt": "2026-10-30T14:00:00Z",
    "leftAt": "2026-10-30T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-30T14:00:00Z",
        "details": {
          "name": "Học Viên #35"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-30T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_117_S35"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-117",
    "roomName": "classroom-session-117",
    "userId": 9,
    "userRole": "STUDENT",
    "participantIdentity": "9",
    "participantName": "Học Viên #9 (Học sinh)",
    "joinedAt": "2026-10-30T14:00:00Z",
    "leftAt": "2026-10-30T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-30T14:00:00Z",
        "details": {
          "name": "Học Viên #9"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-30T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_117_S9"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-118",
    "roomName": "classroom-session-118",
    "userId": 31,
    "userRole": "TUTOR",
    "participantIdentity": "31",
    "participantName": "Gia Sư #31 (Gia sư)",
    "joinedAt": "2026-10-28T18:00:00Z",
    "leftAt": "2026-10-28T20:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-28T18:00:00Z",
        "details": {
          "name": "Gia Sư #31"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-28T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_118_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-28T18:00:00Z",
        "details": {
          "trackSid": "TR_VID_118_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-118",
    "roomName": "classroom-session-118",
    "userId": 35,
    "userRole": "STUDENT",
    "participantIdentity": "35",
    "participantName": "Học Viên #35 (Học sinh)",
    "joinedAt": "2026-10-28T18:00:00Z",
    "leftAt": "2026-10-28T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-28T18:00:00Z",
        "details": {
          "name": "Học Viên #35"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-28T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_118_S35"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-118",
    "roomName": "classroom-session-118",
    "userId": 9,
    "userRole": "STUDENT",
    "participantIdentity": "9",
    "participantName": "Học Viên #9 (Học sinh)",
    "joinedAt": "2026-10-28T18:00:00Z",
    "leftAt": "2026-10-28T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-28T18:00:00Z",
        "details": {
          "name": "Học Viên #9"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-28T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_118_S9"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-118",
    "roomName": "classroom-session-118",
    "userId": 10,
    "userRole": "STUDENT",
    "participantIdentity": "10",
    "participantName": "Học Viên #10 (Học sinh)",
    "joinedAt": "2026-10-28T18:00:00Z",
    "leftAt": "2026-10-28T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-28T18:00:00Z",
        "details": {
          "name": "Học Viên #10"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-28T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_118_S10"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-119",
    "roomName": "classroom-session-119",
    "userId": 32,
    "userRole": "TUTOR",
    "participantIdentity": "32",
    "participantName": "Gia Sư #32 (Gia sư)",
    "joinedAt": "2026-10-26T20:00:00Z",
    "leftAt": "2026-10-26T22:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-26T20:00:00Z",
        "details": {
          "name": "Gia Sư #32"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-26T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_119_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-26T20:00:00Z",
        "details": {
          "trackSid": "TR_VID_119_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-119",
    "roomName": "classroom-session-119",
    "userId": 9,
    "userRole": "STUDENT",
    "participantIdentity": "9",
    "participantName": "Học Viên #9 (Học sinh)",
    "joinedAt": "2026-10-26T20:00:00Z",
    "leftAt": "2026-10-26T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-26T20:00:00Z",
        "details": {
          "name": "Học Viên #9"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-26T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_119_S9"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-119",
    "roomName": "classroom-session-119",
    "userId": 10,
    "userRole": "STUDENT",
    "participantIdentity": "10",
    "participantName": "Học Viên #10 (Học sinh)",
    "joinedAt": "2026-10-26T20:00:00Z",
    "leftAt": "2026-10-26T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-26T20:00:00Z",
        "details": {
          "name": "Học Viên #10"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-26T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_119_S10"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-119",
    "roomName": "classroom-session-119",
    "userId": 14,
    "userRole": "STUDENT",
    "participantIdentity": "14",
    "participantName": "Học Viên #14 (Học sinh)",
    "joinedAt": "2026-10-26T20:00:00Z",
    "leftAt": "2026-10-26T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-26T20:00:00Z",
        "details": {
          "name": "Học Viên #14"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-26T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_119_S14"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-120",
    "roomName": "classroom-session-120",
    "userId": 25,
    "userRole": "TUTOR",
    "participantIdentity": "25",
    "participantName": "Gia Sư #25 (Gia sư)",
    "joinedAt": "2026-10-24T08:00:00Z",
    "leftAt": "2026-10-24T10:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-24T08:00:00Z",
        "details": {
          "name": "Gia Sư #25"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-24T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_120_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-24T08:00:00Z",
        "details": {
          "trackSid": "TR_VID_120_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-120",
    "roomName": "classroom-session-120",
    "userId": 10,
    "userRole": "STUDENT",
    "participantIdentity": "10",
    "participantName": "Học Viên #10 (Học sinh)",
    "joinedAt": "2026-10-24T08:00:00Z",
    "leftAt": "2026-10-24T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-24T08:00:00Z",
        "details": {
          "name": "Học Viên #10"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-24T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_120_S10"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-120",
    "roomName": "classroom-session-120",
    "userId": 14,
    "userRole": "STUDENT",
    "participantIdentity": "14",
    "participantName": "Học Viên #14 (Học sinh)",
    "joinedAt": "2026-10-24T08:00:00Z",
    "leftAt": "2026-10-24T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-24T08:00:00Z",
        "details": {
          "name": "Học Viên #14"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-24T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_120_S14"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-120",
    "roomName": "classroom-session-120",
    "userId": 17,
    "userRole": "STUDENT",
    "participantIdentity": "17",
    "participantName": "Học Viên #17 (Học sinh)",
    "joinedAt": "2026-10-24T08:00:00Z",
    "leftAt": "2026-10-24T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-24T08:00:00Z",
        "details": {
          "name": "Học Viên #17"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-24T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_120_S17"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-121",
    "roomName": "classroom-session-121",
    "userId": 26,
    "userRole": "TUTOR",
    "participantIdentity": "26",
    "participantName": "Gia Sư #26 (Gia sư)",
    "joinedAt": "2026-10-22T14:00:00Z",
    "leftAt": "2026-10-22T16:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-22T14:00:00Z",
        "details": {
          "name": "Gia Sư #26"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-22T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_121_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-22T14:00:00Z",
        "details": {
          "trackSid": "TR_VID_121_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-121",
    "roomName": "classroom-session-121",
    "userId": 14,
    "userRole": "STUDENT",
    "participantIdentity": "14",
    "participantName": "Học Viên #14 (Học sinh)",
    "joinedAt": "2026-10-22T14:00:00Z",
    "leftAt": "2026-10-22T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-22T14:00:00Z",
        "details": {
          "name": "Học Viên #14"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-22T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_121_S14"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-121",
    "roomName": "classroom-session-121",
    "userId": 17,
    "userRole": "STUDENT",
    "participantIdentity": "17",
    "participantName": "Học Viên #17 (Học sinh)",
    "joinedAt": "2026-10-22T14:00:00Z",
    "leftAt": "2026-10-22T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-22T14:00:00Z",
        "details": {
          "name": "Học Viên #17"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-22T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_121_S17"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-121",
    "roomName": "classroom-session-121",
    "userId": 29,
    "userRole": "STUDENT",
    "participantIdentity": "29",
    "participantName": "Học Viên #29 (Học sinh)",
    "joinedAt": "2026-10-22T14:00:00Z",
    "leftAt": "2026-10-22T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-22T14:00:00Z",
        "details": {
          "name": "Học Viên #29"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-22T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_121_S29"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-122",
    "roomName": "classroom-session-122",
    "userId": 27,
    "userRole": "TUTOR",
    "participantIdentity": "27",
    "participantName": "Gia Sư #27 (Gia sư)",
    "joinedAt": "2026-10-20T18:00:00Z",
    "leftAt": "2026-10-20T20:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-20T18:00:00Z",
        "details": {
          "name": "Gia Sư #27"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-20T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_122_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-20T18:00:00Z",
        "details": {
          "trackSid": "TR_VID_122_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-122",
    "roomName": "classroom-session-122",
    "userId": 17,
    "userRole": "STUDENT",
    "participantIdentity": "17",
    "participantName": "Học Viên #17 (Học sinh)",
    "joinedAt": "2026-10-20T18:00:00Z",
    "leftAt": "2026-10-20T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-20T18:00:00Z",
        "details": {
          "name": "Học Viên #17"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-20T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_122_S17"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-122",
    "roomName": "classroom-session-122",
    "userId": 29,
    "userRole": "STUDENT",
    "participantIdentity": "29",
    "participantName": "Học Viên #29 (Học sinh)",
    "joinedAt": "2026-10-20T18:00:00Z",
    "leftAt": "2026-10-20T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-20T18:00:00Z",
        "details": {
          "name": "Học Viên #29"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-20T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_122_S29"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-122",
    "roomName": "classroom-session-122",
    "userId": 13,
    "userRole": "STUDENT",
    "participantIdentity": "13",
    "participantName": "Học Viên #13 (Học sinh)",
    "joinedAt": "2026-10-20T18:00:00Z",
    "leftAt": "2026-10-20T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-20T18:00:00Z",
        "details": {
          "name": "Học Viên #13"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-20T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_122_S13"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-123",
    "roomName": "classroom-session-123",
    "userId": 31,
    "userRole": "TUTOR",
    "participantIdentity": "31",
    "participantName": "Gia Sư #31 (Gia sư)",
    "joinedAt": "2026-10-18T20:00:00Z",
    "leftAt": "2026-10-18T22:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-18T20:00:00Z",
        "details": {
          "name": "Gia Sư #31"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-18T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_123_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-18T20:00:00Z",
        "details": {
          "trackSid": "TR_VID_123_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-123",
    "roomName": "classroom-session-123",
    "userId": 29,
    "userRole": "STUDENT",
    "participantIdentity": "29",
    "participantName": "Học Viên #29 (Học sinh)",
    "joinedAt": "2026-10-18T20:00:00Z",
    "leftAt": "2026-10-18T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-18T20:00:00Z",
        "details": {
          "name": "Học Viên #29"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-18T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_123_S29"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-123",
    "roomName": "classroom-session-123",
    "userId": 13,
    "userRole": "STUDENT",
    "participantIdentity": "13",
    "participantName": "Học Viên #13 (Học sinh)",
    "joinedAt": "2026-10-18T20:00:00Z",
    "leftAt": "2026-10-18T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-18T20:00:00Z",
        "details": {
          "name": "Học Viên #13"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-18T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_123_S13"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-123",
    "roomName": "classroom-session-123",
    "userId": 22,
    "userRole": "STUDENT",
    "participantIdentity": "22",
    "participantName": "Học Viên #22 (Học sinh)",
    "joinedAt": "2026-10-18T20:00:00Z",
    "leftAt": "2026-10-18T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-18T20:00:00Z",
        "details": {
          "name": "Học Viên #22"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-18T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_123_S22"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-124",
    "roomName": "classroom-session-124",
    "userId": 32,
    "userRole": "TUTOR",
    "participantIdentity": "32",
    "participantName": "Gia Sư #32 (Gia sư)",
    "joinedAt": "2026-10-16T08:00:00Z",
    "leftAt": "2026-10-16T10:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-16T08:00:00Z",
        "details": {
          "name": "Gia Sư #32"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-16T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_124_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-16T08:00:00Z",
        "details": {
          "trackSid": "TR_VID_124_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-124",
    "roomName": "classroom-session-124",
    "userId": 13,
    "userRole": "STUDENT",
    "participantIdentity": "13",
    "participantName": "Học Viên #13 (Học sinh)",
    "joinedAt": "2026-10-16T08:00:00Z",
    "leftAt": "2026-10-16T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-16T08:00:00Z",
        "details": {
          "name": "Học Viên #13"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-16T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_124_S13"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-124",
    "roomName": "classroom-session-124",
    "userId": 22,
    "userRole": "STUDENT",
    "participantIdentity": "22",
    "participantName": "Học Viên #22 (Học sinh)",
    "joinedAt": "2026-10-16T08:00:00Z",
    "leftAt": "2026-10-16T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-16T08:00:00Z",
        "details": {
          "name": "Học Viên #22"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-16T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_124_S22"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-124",
    "roomName": "classroom-session-124",
    "userId": 23,
    "userRole": "STUDENT",
    "participantIdentity": "23",
    "participantName": "Học Viên #23 (Học sinh)",
    "joinedAt": "2026-10-16T08:00:00Z",
    "leftAt": "2026-10-16T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-16T08:00:00Z",
        "details": {
          "name": "Học Viên #23"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-16T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_124_S23"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-125",
    "roomName": "classroom-session-125",
    "userId": 25,
    "userRole": "TUTOR",
    "participantIdentity": "25",
    "participantName": "Gia Sư #25 (Gia sư)",
    "joinedAt": "2026-10-14T14:00:00Z",
    "leftAt": "2026-10-14T16:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-14T14:00:00Z",
        "details": {
          "name": "Gia Sư #25"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-14T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_125_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-14T14:00:00Z",
        "details": {
          "trackSid": "TR_VID_125_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-125",
    "roomName": "classroom-session-125",
    "userId": 22,
    "userRole": "STUDENT",
    "participantIdentity": "22",
    "participantName": "Học Viên #22 (Học sinh)",
    "joinedAt": "2026-10-14T14:00:00Z",
    "leftAt": "2026-10-14T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-14T14:00:00Z",
        "details": {
          "name": "Học Viên #22"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-14T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_125_S22"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-125",
    "roomName": "classroom-session-125",
    "userId": 23,
    "userRole": "STUDENT",
    "participantIdentity": "23",
    "participantName": "Học Viên #23 (Học sinh)",
    "joinedAt": "2026-10-14T14:00:00Z",
    "leftAt": "2026-10-14T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-14T14:00:00Z",
        "details": {
          "name": "Học Viên #23"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-14T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_125_S23"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-125",
    "roomName": "classroom-session-125",
    "userId": 24,
    "userRole": "STUDENT",
    "participantIdentity": "24",
    "participantName": "Học Viên #24 (Học sinh)",
    "joinedAt": "2026-10-14T14:00:00Z",
    "leftAt": "2026-10-14T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-14T14:00:00Z",
        "details": {
          "name": "Học Viên #24"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-14T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_125_S24"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-126",
    "roomName": "classroom-session-126",
    "userId": 26,
    "userRole": "TUTOR",
    "participantIdentity": "26",
    "participantName": "Gia Sư #26 (Gia sư)",
    "joinedAt": "2026-10-12T18:00:00Z",
    "leftAt": "2026-10-12T20:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-12T18:00:00Z",
        "details": {
          "name": "Gia Sư #26"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-12T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_126_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-12T18:00:00Z",
        "details": {
          "trackSid": "TR_VID_126_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-126",
    "roomName": "classroom-session-126",
    "userId": 23,
    "userRole": "STUDENT",
    "participantIdentity": "23",
    "participantName": "Học Viên #23 (Học sinh)",
    "joinedAt": "2026-10-12T18:00:00Z",
    "leftAt": "2026-10-12T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-12T18:00:00Z",
        "details": {
          "name": "Học Viên #23"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-12T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_126_S23"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-126",
    "roomName": "classroom-session-126",
    "userId": 24,
    "userRole": "STUDENT",
    "participantIdentity": "24",
    "participantName": "Học Viên #24 (Học sinh)",
    "joinedAt": "2026-10-12T18:00:00Z",
    "leftAt": "2026-10-12T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-12T18:00:00Z",
        "details": {
          "name": "Học Viên #24"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-12T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_126_S24"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-126",
    "roomName": "classroom-session-126",
    "userId": 33,
    "userRole": "STUDENT",
    "participantIdentity": "33",
    "participantName": "Học Viên #33 (Học sinh)",
    "joinedAt": "2026-10-12T18:00:00Z",
    "leftAt": "2026-10-12T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-12T18:00:00Z",
        "details": {
          "name": "Học Viên #33"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-12T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_126_S33"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-127",
    "roomName": "classroom-session-127",
    "userId": 27,
    "userRole": "TUTOR",
    "participantIdentity": "27",
    "participantName": "Gia Sư #27 (Gia sư)",
    "joinedAt": "2026-10-10T20:00:00Z",
    "leftAt": "2026-10-10T22:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-10T20:00:00Z",
        "details": {
          "name": "Gia Sư #27"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-10T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_127_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-10T20:00:00Z",
        "details": {
          "trackSid": "TR_VID_127_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-127",
    "roomName": "classroom-session-127",
    "userId": 24,
    "userRole": "STUDENT",
    "participantIdentity": "24",
    "participantName": "Học Viên #24 (Học sinh)",
    "joinedAt": "2026-10-10T20:00:00Z",
    "leftAt": "2026-10-10T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-10T20:00:00Z",
        "details": {
          "name": "Học Viên #24"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-10T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_127_S24"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-127",
    "roomName": "classroom-session-127",
    "userId": 33,
    "userRole": "STUDENT",
    "participantIdentity": "33",
    "participantName": "Học Viên #33 (Học sinh)",
    "joinedAt": "2026-10-10T20:00:00Z",
    "leftAt": "2026-10-10T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-10T20:00:00Z",
        "details": {
          "name": "Học Viên #33"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-10T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_127_S33"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-127",
    "roomName": "classroom-session-127",
    "userId": 34,
    "userRole": "STUDENT",
    "participantIdentity": "34",
    "participantName": "Học Viên #34 (Học sinh)",
    "joinedAt": "2026-10-10T20:00:00Z",
    "leftAt": "2026-10-10T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-10T20:00:00Z",
        "details": {
          "name": "Học Viên #34"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-10T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_127_S34"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-128",
    "roomName": "classroom-session-128",
    "userId": 31,
    "userRole": "TUTOR",
    "participantIdentity": "31",
    "participantName": "Gia Sư #31 (Gia sư)",
    "joinedAt": "2026-10-08T08:00:00Z",
    "leftAt": "2026-10-08T10:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-08T08:00:00Z",
        "details": {
          "name": "Gia Sư #31"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-08T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_128_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-08T08:00:00Z",
        "details": {
          "trackSid": "TR_VID_128_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-128",
    "roomName": "classroom-session-128",
    "userId": 33,
    "userRole": "STUDENT",
    "participantIdentity": "33",
    "participantName": "Học Viên #33 (Học sinh)",
    "joinedAt": "2026-10-08T08:00:00Z",
    "leftAt": "2026-10-08T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-08T08:00:00Z",
        "details": {
          "name": "Học Viên #33"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-08T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_128_S33"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-128",
    "roomName": "classroom-session-128",
    "userId": 34,
    "userRole": "STUDENT",
    "participantIdentity": "34",
    "participantName": "Học Viên #34 (Học sinh)",
    "joinedAt": "2026-10-08T08:00:00Z",
    "leftAt": "2026-10-08T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-08T08:00:00Z",
        "details": {
          "name": "Học Viên #34"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-08T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_128_S34"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-128",
    "roomName": "classroom-session-128",
    "userId": 35,
    "userRole": "STUDENT",
    "participantIdentity": "35",
    "participantName": "Học Viên #35 (Học sinh)",
    "joinedAt": "2026-10-08T08:00:00Z",
    "leftAt": "2026-10-08T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-08T08:00:00Z",
        "details": {
          "name": "Học Viên #35"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-08T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_128_S35"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-129",
    "roomName": "classroom-session-129",
    "userId": 32,
    "userRole": "TUTOR",
    "participantIdentity": "32",
    "participantName": "Gia Sư #32 (Gia sư)",
    "joinedAt": "2026-10-06T14:00:00Z",
    "leftAt": "2026-10-06T16:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-06T14:00:00Z",
        "details": {
          "name": "Gia Sư #32"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-06T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_129_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-06T14:00:00Z",
        "details": {
          "trackSid": "TR_VID_129_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-129",
    "roomName": "classroom-session-129",
    "userId": 34,
    "userRole": "STUDENT",
    "participantIdentity": "34",
    "participantName": "Học Viên #34 (Học sinh)",
    "joinedAt": "2026-10-06T14:00:00Z",
    "leftAt": "2026-10-06T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-06T14:00:00Z",
        "details": {
          "name": "Học Viên #34"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-06T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_129_S34"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-129",
    "roomName": "classroom-session-129",
    "userId": 35,
    "userRole": "STUDENT",
    "participantIdentity": "35",
    "participantName": "Học Viên #35 (Học sinh)",
    "joinedAt": "2026-10-06T14:00:00Z",
    "leftAt": "2026-10-06T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-06T14:00:00Z",
        "details": {
          "name": "Học Viên #35"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-06T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_129_S35"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-129",
    "roomName": "classroom-session-129",
    "userId": 9,
    "userRole": "STUDENT",
    "participantIdentity": "9",
    "participantName": "Học Viên #9 (Học sinh)",
    "joinedAt": "2026-10-06T14:00:00Z",
    "leftAt": "2026-10-06T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-06T14:00:00Z",
        "details": {
          "name": "Học Viên #9"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-06T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_129_S9"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-130",
    "roomName": "classroom-session-130",
    "userId": 25,
    "userRole": "TUTOR",
    "participantIdentity": "25",
    "participantName": "Gia Sư #25 (Gia sư)",
    "joinedAt": "2026-10-04T18:00:00Z",
    "leftAt": "2026-10-04T20:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-04T18:00:00Z",
        "details": {
          "name": "Gia Sư #25"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-04T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_130_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-04T18:00:00Z",
        "details": {
          "trackSid": "TR_VID_130_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-130",
    "roomName": "classroom-session-130",
    "userId": 35,
    "userRole": "STUDENT",
    "participantIdentity": "35",
    "participantName": "Học Viên #35 (Học sinh)",
    "joinedAt": "2026-10-04T18:00:00Z",
    "leftAt": "2026-10-04T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-04T18:00:00Z",
        "details": {
          "name": "Học Viên #35"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-04T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_130_S35"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-130",
    "roomName": "classroom-session-130",
    "userId": 9,
    "userRole": "STUDENT",
    "participantIdentity": "9",
    "participantName": "Học Viên #9 (Học sinh)",
    "joinedAt": "2026-10-04T18:00:00Z",
    "leftAt": "2026-10-04T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-04T18:00:00Z",
        "details": {
          "name": "Học Viên #9"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-04T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_130_S9"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-130",
    "roomName": "classroom-session-130",
    "userId": 10,
    "userRole": "STUDENT",
    "participantIdentity": "10",
    "participantName": "Học Viên #10 (Học sinh)",
    "joinedAt": "2026-10-04T18:00:00Z",
    "leftAt": "2026-10-04T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-04T18:00:00Z",
        "details": {
          "name": "Học Viên #10"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-04T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_130_S10"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-131",
    "roomName": "classroom-session-131",
    "userId": 26,
    "userRole": "TUTOR",
    "participantIdentity": "26",
    "participantName": "Gia Sư #26 (Gia sư)",
    "joinedAt": "2026-10-02T20:00:00Z",
    "leftAt": "2026-10-02T22:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-02T20:00:00Z",
        "details": {
          "name": "Gia Sư #26"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-02T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_131_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-10-02T20:00:00Z",
        "details": {
          "trackSid": "TR_VID_131_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-131",
    "roomName": "classroom-session-131",
    "userId": 9,
    "userRole": "STUDENT",
    "participantIdentity": "9",
    "participantName": "Học Viên #9 (Học sinh)",
    "joinedAt": "2026-10-02T20:00:00Z",
    "leftAt": "2026-10-02T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-02T20:00:00Z",
        "details": {
          "name": "Học Viên #9"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-02T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_131_S9"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-131",
    "roomName": "classroom-session-131",
    "userId": 10,
    "userRole": "STUDENT",
    "participantIdentity": "10",
    "participantName": "Học Viên #10 (Học sinh)",
    "joinedAt": "2026-10-02T20:00:00Z",
    "leftAt": "2026-10-02T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-02T20:00:00Z",
        "details": {
          "name": "Học Viên #10"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-02T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_131_S10"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-131",
    "roomName": "classroom-session-131",
    "userId": 14,
    "userRole": "STUDENT",
    "participantIdentity": "14",
    "participantName": "Học Viên #14 (Học sinh)",
    "joinedAt": "2026-10-02T20:00:00Z",
    "leftAt": "2026-10-02T22:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-10-02T20:00:00Z",
        "details": {
          "name": "Học Viên #14"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-10-02T20:00:00Z",
        "details": {
          "trackSid": "TR_AUD_131_S14"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-132",
    "roomName": "classroom-session-132",
    "userId": 27,
    "userRole": "TUTOR",
    "participantIdentity": "27",
    "participantName": "Gia Sư #27 (Gia sư)",
    "joinedAt": "2026-09-30T08:00:00Z",
    "leftAt": "2026-09-30T10:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-30T08:00:00Z",
        "details": {
          "name": "Gia Sư #27"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-30T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_132_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-09-30T08:00:00Z",
        "details": {
          "trackSid": "TR_VID_132_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-132",
    "roomName": "classroom-session-132",
    "userId": 10,
    "userRole": "STUDENT",
    "participantIdentity": "10",
    "participantName": "Học Viên #10 (Học sinh)",
    "joinedAt": "2026-09-30T08:00:00Z",
    "leftAt": "2026-09-30T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-30T08:00:00Z",
        "details": {
          "name": "Học Viên #10"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-30T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_132_S10"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-132",
    "roomName": "classroom-session-132",
    "userId": 14,
    "userRole": "STUDENT",
    "participantIdentity": "14",
    "participantName": "Học Viên #14 (Học sinh)",
    "joinedAt": "2026-09-30T08:00:00Z",
    "leftAt": "2026-09-30T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-30T08:00:00Z",
        "details": {
          "name": "Học Viên #14"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-30T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_132_S14"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-132",
    "roomName": "classroom-session-132",
    "userId": 17,
    "userRole": "STUDENT",
    "participantIdentity": "17",
    "participantName": "Học Viên #17 (Học sinh)",
    "joinedAt": "2026-09-30T08:00:00Z",
    "leftAt": "2026-09-30T10:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-30T08:00:00Z",
        "details": {
          "name": "Học Viên #17"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-30T08:00:00Z",
        "details": {
          "trackSid": "TR_AUD_132_S17"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-133",
    "roomName": "classroom-session-133",
    "userId": 31,
    "userRole": "TUTOR",
    "participantIdentity": "31",
    "participantName": "Gia Sư #31 (Gia sư)",
    "joinedAt": "2026-09-28T14:00:00Z",
    "leftAt": "2026-09-28T16:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-28T14:00:00Z",
        "details": {
          "name": "Gia Sư #31"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-28T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_133_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-09-28T14:00:00Z",
        "details": {
          "trackSid": "TR_VID_133_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-133",
    "roomName": "classroom-session-133",
    "userId": 14,
    "userRole": "STUDENT",
    "participantIdentity": "14",
    "participantName": "Học Viên #14 (Học sinh)",
    "joinedAt": "2026-09-28T14:00:00Z",
    "leftAt": "2026-09-28T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-28T14:00:00Z",
        "details": {
          "name": "Học Viên #14"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-28T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_133_S14"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-133",
    "roomName": "classroom-session-133",
    "userId": 17,
    "userRole": "STUDENT",
    "participantIdentity": "17",
    "participantName": "Học Viên #17 (Học sinh)",
    "joinedAt": "2026-09-28T14:00:00Z",
    "leftAt": "2026-09-28T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-28T14:00:00Z",
        "details": {
          "name": "Học Viên #17"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-28T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_133_S17"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-133",
    "roomName": "classroom-session-133",
    "userId": 29,
    "userRole": "STUDENT",
    "participantIdentity": "29",
    "participantName": "Học Viên #29 (Học sinh)",
    "joinedAt": "2026-09-28T14:00:00Z",
    "leftAt": "2026-09-28T16:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-28T14:00:00Z",
        "details": {
          "name": "Học Viên #29"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-28T14:00:00Z",
        "details": {
          "trackSid": "TR_AUD_133_S29"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-134",
    "roomName": "classroom-session-134",
    "userId": 32,
    "userRole": "TUTOR",
    "participantIdentity": "32",
    "participantName": "Gia Sư #32 (Gia sư)",
    "joinedAt": "2026-09-26T18:00:00Z",
    "leftAt": "2026-09-26T20:00:00Z",
    "durationSeconds": 7200,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-26T18:00:00Z",
        "details": {
          "name": "Gia Sư #32"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-26T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_134_T"
        }
      },
      {
        "event": "PUBLISHED_VIDEO",
        "timestamp": "2026-09-26T18:00:00Z",
        "details": {
          "trackSid": "TR_VID_134_T"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-134",
    "roomName": "classroom-session-134",
    "userId": 17,
    "userRole": "STUDENT",
    "participantIdentity": "17",
    "participantName": "Học Viên #17 (Học sinh)",
    "joinedAt": "2026-09-26T18:00:00Z",
    "leftAt": "2026-09-26T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-26T18:00:00Z",
        "details": {
          "name": "Học Viên #17"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-26T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_134_S17"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-134",
    "roomName": "classroom-session-134",
    "userId": 29,
    "userRole": "STUDENT",
    "participantIdentity": "29",
    "participantName": "Học Viên #29 (Học sinh)",
    "joinedAt": "2026-09-26T18:00:00Z",
    "leftAt": "2026-09-26T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-26T18:00:00Z",
        "details": {
          "name": "Học Viên #29"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-26T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_134_S29"
        }
      }
    ]
  },
  {
    "sessionId": "classroom-session-134",
    "roomName": "classroom-session-134",
    "userId": 13,
    "userRole": "STUDENT",
    "participantIdentity": "13",
    "participantName": "Học Viên #13 (Học sinh)",
    "joinedAt": "2026-09-26T18:00:00Z",
    "leftAt": "2026-09-26T20:00:00Z",
    "durationSeconds": 7080,
    "disconnectReason": "CLIENT_INITIATED",
    "eventHistory": [
      {
        "event": "JOINED",
        "timestamp": "2026-09-26T18:00:00Z",
        "details": {
          "name": "Học Viên #13"
        }
      },
      {
        "event": "PUBLISHED_AUDIO",
        "timestamp": "2026-09-26T18:00:00Z",
        "details": {
          "trackSid": "TR_AUD_134_S13"
        }
      }
    ]
  }
];

print("Seeding meeting_session_logs (" + sessionLogs.length + " records)...");
sessionLogs.forEach(doc => {
    targetDb.meeting_session_logs.updateOne(
        { sessionId: doc.sessionId },
        { $set: doc },
        { upsert: true }
    );
});

print("Seeding meeting_participant_logs (" + participantLogs.length + " records)...");
participantLogs.forEach(doc => {
    targetDb.meeting_participant_logs.updateOne(
        { sessionId: doc.sessionId, participantIdentity: doc.participantIdentity },
        { $set: doc },
        { upsert: true }
    );
});

print("Meeting logs successfully seeded into MongoDB!");
