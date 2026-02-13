# Photo360 Studio

Aplikacja webowa do budowania spacerów 360° ze zdjęć panoramicznych oraz dodawania klikalnych hotspotów.

## Najważniejsze funkcje

- Dodawanie wielu scen 360° z lokalnych plików.
- Dwa typy hotspotów:
  - **Informacja (🔍)** – punkt na obiekcie (np. obraz na ścianie), który otwiera opis i zdjęcie.
  - **Nawigacja (➜)** – strzałka przenosząca płynnie do kolejnej sceny.
- Precyzyjne pozycjonowanie hotspotów:
  - kliknięcie dokładnego miejsca na panoramie,
  - ręczna korekta współrzędnych `pitch/yaw` w formularzu.
- Eksport i import projektu do pliku JSON.
- Automatyczny zapis projektu w `localStorage`.

## Uruchomienie

```bash
python3 -m http.server 4173
```

Otwórz przeglądarkę:

```text
http://localhost:4173
```

## Wymagania dla zdjęć 360°

Najlepiej używać panoram equirectangular (proporcje 2:1), np. 6000x3000 px.
