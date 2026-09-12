# OmeConnector Companion

Rozszerzenie Chromium dla OmeTV.

## Instalacja

1. Otwórz chrome://extensions.
2. Włącz Developer mode.
3. Kliknij Load unpacked.
4. Wskaż folder extension.
5. Otwórz ome.tv i odśwież kartę.

## Obecnie działa

- przesuwany overlay z zapamiętaną pozycją,
- skrót Alt+O do pokazywania i ukrywania panelu,
- liczba aktywnych kamer i ścieżek audio,
- rozdzielczość obrazu i czas sesji,
- ręczny przycisk Pomiń teraz,
- Auto Skip po liczbie aktywnych kamer,
- opcja Skip bez aktywnej kamery,
- licznik wykonanych Auto Skipów,
- kompaktowy panel,
- ustawienia zapisane lokalnie,
- automatyczne sprawdzanie wersji z GitHuba co godzinę,
- informacja o aktualizacji i link do pobrania.

## Aktualizacje

Rozszerzenie sprawdza plik extension/update.json na GitHubie. Przy instalacji jako Load unpacked Chrome nie może sam podmienić własnych plików, więc po aktualizacji:

1. pobierz najnowszy ZIP repozytorium,
2. zastąp lokalny folder extension,
3. kliknij Odśwież na chrome://extensions.

Po publikacji w Chrome Web Store aktualizacje będą obsługiwane przez mechanizm sklepu.

Geolokalizacja i rozbudowane filtry sieciowe wymagają własnego, jawnego backendu. Nie kopiujemy kodu ani tokenów OME.UNDFND.
