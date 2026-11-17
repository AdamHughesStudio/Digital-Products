# App Store Connect: App Privacy answers (draft)

These are the answers for the "App Privacy" section in App Store Connect, worked out from what the
app actually does today. Google Play's "Data safety" form asks the same things in a different layout,
so the same answers carry over.

**Do you or your third-party partners collect data from this app?** Yes.

**Tracking:** No, today. This changes once personalised adverts arrive (see the last section).

**Location from the phone:** not declared as collected. Apple counts data as collected only when it
leaves the phone, and PlusFore uses the GPS fix on the phone to work out distances, without sending
or storing it. The iPhone still shows the permission prompt with our wording ("PlusFore uses your
location while you search, to show games, competitions and clubs near where you are."). If analytics
or adverts are ever given the location, declare Precise Location.

For every type below: **Linked to the user: Yes. Used for tracking: No. Purpose: App Functionality**
(plus "Other Purposes: safety and moderation" where noted).

| Apple category | Data type | What it is in PlusFore |
| --- | --- | --- |
| Contact Info | Email Address | Sign-in with a one-time code |
| Contact Info | Name | First and last name on the profile |
| Location | Coarse Location | The town or area you choose as your base, and its map position |
| User Content | Photos or Videos | Profile photo |
| User Content | Emails or Text Messages | Game chats and direct messages (Apple puts in-app messages here) |
| User Content | Other User Content | Game notes, bio, reports (also safety and moderation) |
| Identifiers | User ID | Account id and username |
| Identifiers | Device ID | Push notification token |
| Usage Data | Product Interaction | Saved competitions, games joined, friend requests |
| Other Data | Other Data Types | Handicap and home club |

**Not collected today:** Health and Fitness, Financial Info, Precise Location, Sensitive Info,
Contacts, Browsing History, Search History, Diagnostics, Purchases.

## When analytics and adverts are added

Update the answers in App Store Connect (and Play's Data safety form) in the same release:

| Apple category | Data type | Purpose | Tracking? |
| --- | --- | --- | --- |
| Usage Data | Product Interaction | Analytics | No |
| Diagnostics | Crash Data, Performance Data | App Functionality, Analytics | No |
| Identifiers | Device ID (install id) | Analytics | No |
| Usage Data | Advertising Data | Third-Party Advertising | Yes, if personalised |
| Identifiers | Device ID (advertising identifier, IDFA) | Third-Party Advertising | Yes |
| Location | Coarse Location (from IP, by the ad network) | Third-Party Advertising | Yes, if personalised |

- **Personalised adverts mean tracking:** the app must show Apple's App Tracking Transparency prompt
  (expo-tracking-transparency) before the ad network reads the advertising identifier, and only
  personalise if the answer is yes. Declare "Used for tracking: Yes" on the rows marked above.
- **UK and Ireland consent:** the ad network and analytics need a consent screen first (UK GDPR,
  PECR, and the Irish equivalent). Google requires a certified consent platform for AdMob in the UK
  and EEA; its own User Messaging Platform is free and does this.
- **Privacy manifest:** each SDK ships its own Apple privacy manifest; check they're included.
- **Choose providers that sign a data processing agreement** and say where they store data, so the
  privacy policy's [CONFIRM] gaps can be filled.

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
- **Location permission:** the prompt only appears when someone searches or taps the map's location
  button, never at launch, and the app works fully if they say no. Apple checks both.
- **Age rating questionnaire:** user generated content and unrestricted messaging between users, so
  expect a 12+ or higher rating whatever minimum age we set in the terms.
