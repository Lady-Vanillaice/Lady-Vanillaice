## Hi there 👋

<!--
**Lady-Vanillaice/Lady-Vanillaice** is a ✨ _special_ ✨ repository because its `README.md` (this file) appears on your GitHub profile.

Here are some ideas to get you started:

- 🔭 I’m currently working on ...
- 🌱 I’m currently learning ...
- 👯 I’m looking to collaborate on ...
- 🤔 I’m looking for help with ...
- 💬 Ask me about ...
- 📫 How to reach me: ...
- 😄 Pronouns: ...
- ⚡ Fun fact: ...
-->

## Transactional email

Booking notifications and confirmations use Resend directly when these
production environment variables are configured:

- `RESEND_API_KEY` – Resend API key with sending permission
- `EMAIL_FROM` – verified sender, for example
  `Lady Vanilla Ice <noreply@lady-vanillaice.com>`

Without `RESEND_API_KEY`, the application falls back to the legacy
Lovable-backed database queue.
