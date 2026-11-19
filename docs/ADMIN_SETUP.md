# ArtHQ admin access

1. Register through the ArtHQ client portal using the staff member's own email and password. Complete the company or name and phone fields.
2. In the ArtHQ Firebase Console, open Authentication and verify the intended person's email and UID through your usual staff identity process.
3. In Firestore, open the `users` document with that UID. Set its existing `role` field to `admin`. Only a trusted project operator may grant or revoke staff access.
4. Sign in and open **Admin workspace**. Confirm that the Projects, Support, and Enquiries views load. To revoke admin access, change the role back to `user`.

Admins may start, complete, or cancel active projects. They may start and resolve support tickets and review enquiries. Select **Reply by email** to open the device's mail client with the visitor's address and a suggested subject and greeting. Send the reply from the mail client, then mark the enquiry as read or responded in ArtHQ. ArtHQ does not send mail or verify delivery. Only a trusted Firebase project operator may assign or revoke the `admin` role; users cannot grant themselves access.
