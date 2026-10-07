# bzns.md — your business document

`bzns.md` is the one document that tells Layla how your business works. You write it once during setup, at **Catalyst setup → Your business**, and edit it any time in **Dashboard → Settings → Business**.

## The three rules

1. **Write in Arabic or English.** Layla replies in the customer's language.
2. **No prices, rents, fees or stock.** Layla reads those live from Services & Prices or your Hasib stock, so there is only one place to update them. The editor refuses a document that contains an amount such as "400 OMR" or "commission 2%". Words like "free viewing" are fine.
3. **Not sure about something? Leave it out.** Layla hands those questions to your team instead of guessing.

## How it works

1. Pick your sector. The editor loads a template with every section and a hint in `[brackets]`.
2. Replace every `[bracket]` with your real details, or delete that line. You can't publish until they're all gone.
3. **Save draft** keeps your work without changing what Layla says.
4. Tick **I checked these business details**, then **Publish**. Layla answers from the new version from the next message onward.

If you'd rather not write, open **Answer a few questions instead** and the editor fills the sections for you. You still review and publish.

## Layla's style

Above the editor, pick how Layla sounds. Your facts never change, only her wording around them.

| Style | Sounds like |
|---|---|
| **Professional & sharp** | "Hello. Layla, Qurum Coast Properties." Short and precise; good for B2B and premium brands |
| **Helpful & sweet** | "Hi! I'm Layla from Qurum Coast Properties 😊" Warm, with at most one emoji per message |
| **Informative & nice** (default) | "Hello, I'm Layla from Qurum Coast Properties." Clear and polite |

The editor saves your choice as the `tone:` line at the top of the document (`sharp`, `sweet` or `informative`).

## What Layla does on her own

- **She answers 24/7.** Your opening hours never stop her replying.
- **Every conversation opens with a welcome** that names your business and Layla. In the same message she asks for the customer's name (unless WhatsApp already gave it) and what they're looking for, so you get a lead in one or two messages.
- **She answers from your document, word for word.** A customer asking "do you deliver to Seeb?", "can I return it?" or "how do viewings work?" gets the text of your matching section. A reworded FAQ question gets your FAQ answer. She never shows the "When Layla should hand over" section; that is for her only.
- **She treats small talk as small talk.** "Thanks" gets a short "you're welcome"; "ok" or 👍 gets no reply. Neither goes to your team.
- **A customer saying what they want is a lead.** "I'm Ahmed, looking for a villa to rent in Al Mouj" is saved to the contact (name, rent, villa, Al Mouj), and Layla moves on to the next question.
- **She hands the chat to your team**, with the reason shown in your inbox, when a customer:
  - asks for a person;
  - tries to negotiate or asks for a discount;
  - is abusive;
  - sends a photo, voice note or very long message;
  - asks something your document doesn't answer;
  - (for law and finance firms) asks for legal or financial advice.
- **She never repeats herself into a loop.** A chat that sends the same message over and over, or receives more than 10 automated replies within an hour, goes to your team after one short notice.
- **Busy moments are paced, not dropped.** Layla sends up to 10 replies a minute per WhatsApp number; anything above that goes out the following minute. Above 100 automated replies a day per number, the remaining chats go to your team.

## What to include

| Section | What to write |
|---|---|
| `name:` and `sector:` at the top | Your business name and sector. The template fills in the sector |
| About us | Two or three sentences: who you are, since when, what makes you different |
| What we offer | A list of your services or product categories. **Required** |
| Areas we cover | Cities or neighbourhoods you serve |
| Sector sections | Viewings, delivery, warranty, booking: whatever customers ask about in your sector |
| Location | Address and Google Maps link |
| Hours | Optional: opening days and times, if customers ask. Layla herself answers 24/7 |
| When Layla should hand over to the team | Complaints, negotiations, legal or medical questions |
| FAQ | `Q:` / `A:` pairs (or `س:` / `ج:` in Arabic) for questions customers often ask |

## Example: a real-estate agency, filled in

```markdown
---
name: Qurum Coast Properties
sector: real-estate
---

# Qurum Coast Properties

## About us
Family-run agency in Muscat since 2012. We handle sales and rentals in the
capital's coastal neighbourhoods and answer every enquiry the same day.

## What we offer
- Buying and selling residential and commercial property
- Rentals: apartments, villas and offices
- Property management for landlords
- Free valuations for owners

## Areas we cover
Al Mouj, Qurum, Al Khuwair, Madinat Sultan Qaboos and Bausher.

## How viewings work
Send us the property reference or the area and type you want, plus two times
that suit you. We confirm within the same working day. Viewings run Sunday to
Thursday, 9:00 to 18:00, and an agent always attends.

## Renting: documents and steps
Individuals: passport or Omani ID, residence card for expats, and a salary
letter. Companies also need their commercial registration. We prepare the
tenancy contract and register it with the municipality.

## Buying: steps
Reservation, sale agreement, then registration at the Ministry of Housing.
Non-Omanis can buy freehold in approved integrated tourism complexes such as
Al Mouj and Muscat Bay.

## Listing your property with us
Send the location, size and a few photos. We visit for a free valuation,
agree the listing terms with you, then market the property and handle viewings.

## Location
Building 41, Way 2601, Al Qurum, Muscat.
[Google Maps](https://maps.app.goo.gl/example)

## Hours
Sunday to Thursday 8:30 to 17:30. Saturday 9:00 to 13:00. Closed Friday.

## When Layla should hand over to the team
Price negotiations, complaints, contract disputes and anything legal.

## FAQ
Q: Are viewings free?
A: Yes, viewings are always free.

Q: Do you manage properties for owners who live abroad?
A: Yes. We handle tenants, maintenance and rent collection.
```

Prices for each property come from your Hasib listings, so they never appear in this document.

## Limits

- Up to 10,000 characters (about 1,500 words).
- No HTML. Plain text and simple markdown only: `#` headings, `-` lists, `**bold**`, and `[links](https://…)`.
- The first 12 FAQ pairs feed Layla's FAQ answers, including reworded questions.
- Sector sections (delivery, returns, viewings, insurance, warranty, booking and so on) are quoted when a customer asks about that topic. Give each section a clear heading, such as "Delivery and pickup" or "Returns and exchanges", so Layla can find it.
