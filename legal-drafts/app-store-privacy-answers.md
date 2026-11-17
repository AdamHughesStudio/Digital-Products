# App Store Connect: App Privacy answers (draft)

These are the answers for the "App Privacy" section in App Store Connect, worked out from what the
app actually does today. Google Play's "Data safety" form asks the same things in a different layout,
so the same answers carry over.

**Do you or your third-party partners collect data from this app?** Yes.

**Tracking:** No. PlusFore doesn't link data with other companies' data for advertising, and has no
ad or analytics SDKs. So no App Tracking Transparency prompt is needed.

For every type below: **Linked to the user: Yes. Used for tracking: No. Purpose: App Functionality**
(plus "Other Purposes: safety and moderation" where noted).

| Apple category | Data type | What it is in PlusFore |
| --- | --- | --- |
| Contact Info | Email Address | Sign-in with a one-time code |
| Contact Info | Name | First and last name on the profile |
| Location | Coarse Location | The town or area you choose, and its map position (not GPS) |
| User Content | Photos or Videos | Profile photo |
| User Content | Emails or Text Messages | Game chats and direct messages (Apple puts in-app messages here) |
| User Content | Other User Content | Game notes, bio, reports (also safety and moderation) |
| Identifiers | User ID | Account id and username |
| Identifiers | Device ID | Push notification token |
| Usage Data | Product Interaction | Saved competitions, games joined, friend requests |
| Other Data | Other Data Types | Handicap and home club |

**Not collected:** Health and Fitness, Financial Info, Precise Location, Sensitive Info, Contacts,
Browsing History, Search History, Diagnostics (no crash reporting SDK yet), Purchases.

Things that would change these answers, so revisit them if any happen:
- Adding crash reporting or analytics (for example Sentry or EAS Insights): add Diagnostics.
- Using GPS for "near me": change to Precise or keep Coarse depending on accuracy requested.
- In-app payments for promoted listings or entry fees: add Purchases and Financial Info.

## Other App Review items

- **Privacy policy URL:** required. Publish the app policy at, for example, getplusfore.app/app-privacy.
- **Terms (EULA):** either link our terms in the App Description, or use Apple's standard EULA. As we
  have user content, our own terms with the "no tolerance for objectionable content" clause are
  needed and must be agreed at sign-up (guideline 1.2).
- **Guideline 1.2 checklist (user generated content):** filter or moderation (admin reports queue,
  done), report a user (done), block a user (done, server side), published contact details (needs the
  support email), agreement to terms at sign-up (to do).
- **Guideline 5.1.1(v) account deletion:** in the app under Profile, deletes everything (done and
  checked).
- **Sign in with Apple:** not needed, because we only offer email sign-in, not Google or Facebook.
- **Review account:** App Review needs a working sign-in. Email codes can't be received by Apple's
  reviewers, so we'll need a demo account with a fixed code or password. To do before submission.
- **Age rating questionnaire:** user generated content and unrestricted messaging between users, so
  expect a 12+ or higher rating whatever minimum age we set in the terms.
