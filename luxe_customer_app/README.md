# luxe_customer_app

Flutter customer app for Luxe Jewelry.

## Configure the backend URL

The app uses the deployed Express API for login, products, cart, and orders.
Pass the API base URL when building or running the app; include `/api`:

```powershell
flutter build apk --dart-define=API_BASE_URL=https://YOUR-VERCEL-DOMAIN/api
```

For local development on an Android emulator, the default is
`http://10.0.2.2:5000/api`. Override it with your development server URL when
testing on another device:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
```

Use your computer's LAN IP instead of `10.0.2.2` when testing on a physical
Android device. Rebuild the app with the Vercel URL before distributing it.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
