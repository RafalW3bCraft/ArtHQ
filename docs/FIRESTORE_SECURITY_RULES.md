# ArtHQ Firestore access

Deploy [the rules](../firestore.rules) and [the indexes](../firestore.indexes.json) to the fresh ArtHQ project. Deployment and emulator commands are in the [README](../README.md).

| Collection | Creation | Visibility | Updates |
| --- | --- | --- | --- |
| `users` | Signed-in user creates their own client profile | Owner and admin | Trusted Firebase project operators manage roles |
| `projects` | Owner submits a pending brief | Owner and admin | Admins may start or cancel a pending project and complete or cancel an active one |
| `support_messages` | Owner opens a ticket | Owner and admin | Admins move an open ticket to in progress and then resolved |
| `contact_submissions` | Public form submits a validated new enquiry | Staff | Staff mark it read and then responded |

Client queries for projects and tickets filter by the authenticated UID before ordering by creation time. The signup listener observes the profile. A transaction creates it once from the submitted fields and also supports completing an interrupted registration. Other document paths and client-side deletes are denied.
