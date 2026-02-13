# Photo360 Studio

Aplikacja webowa do budowania spacerów 360° ze zdjęć panoramicznych oraz dodawania klikalnych hotspotów informacyjnych.

## Funkcje

- Dodawanie wielu scen 360° z lokalnych plików.
- Tworzenie hotspotów:
  - **informacyjnych** (tytuł, opis, zdjęcie obiektu),
  - **nawigacyjnych** (przejście między scenami).
- Kliknięcie na panoramie ustawia dokładne współrzędne hotspotu (pitch/yaw).
- Eksport i import projektu do pliku JSON.
- Automatyczny zapis projektu w `localStorage`.

## Uruchomienie

To statyczna aplikacja (HTML/CSS/JS). Najprościej uruchomić lokalny serwer:

```bash
python3 -m http.server 4173
```

Następnie otwórz w przeglądarce:

```text
http://localhost:4173
```

## Wymagania dla zdjęć 360°

Najlepiej używać panoram equirectangular (proporcje 2:1), np. 6000x3000 px. Dzięki temu spacer będzie wyglądał poprawnie bez zniekształceń.
