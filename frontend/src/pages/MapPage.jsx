import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const DEFAULT_CENTER = [69.22, 41.32]; // Tashkent coordinates

export default function MapPage() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const maplibreRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentLngLat, setCurrentLngLat] = useState(null);
  const { updateStore, addToast } = useAppContext();
  const location = useLocation();
  const targetStore = location.state?.store ?? null;

  useEffect(() => {
    let isMounted = true;
    let maplibreModule;

    const initMap = async () => {
      try {
        maplibreModule = await import('maplibre-gl');
        if (!mapContainerRef.current || !isMounted) return;
        maplibreRef.current = maplibreModule;

        const initializeMap = (center) => {
          mapRef.current = new maplibreRef.current.Map({
            container: mapContainerRef.current,
            style: {
              version: 8,
              sources: {
                osm: {
                  type: 'raster',
                  tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                  tileSize: 256,
                  attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                }
              },
              layers: [
                {
                  id: 'osm',
                  type: 'raster',
                  source: 'osm'
                }
              ]
            },
            center: targetStore?.coordinates ?? center,
            zoom: 12,
            pitch: 20
          });

          mapRef.current.addControl(new maplibreRef.current.NavigationControl(), 'top-right');

          mapRef.current.on('load', () => {
            setLoading(false);
            const initialCoords = targetStore?.coordinates ?? center;
            markerRef.current = new maplibreRef.current.Marker({ color: '#007AFF' })
              .setLngLat(initialCoords)
              .addTo(mapRef.current);
            setCurrentLngLat({ lng: initialCoords[0], lat: initialCoords[1] });
          });

          mapRef.current.on('click', (event) => {
            const coords = [event.lngLat.lng, event.lngLat.lat];
            setCurrentLngLat({ lng: coords[0], lat: coords[1] });
            if (markerRef.current) {
              markerRef.current.setLngLat(coords);
            } else {
              markerRef.current = new maplibreRef.current.Marker({ color: '#007AFF' })
                .setLngLat(coords)
                .addTo(mapRef.current);
            }
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
          });
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!isMounted) return;
              const coords = [position.coords.longitude, position.coords.latitude];
              initializeMap(coords);
            },
            () => {
              addToast({
                variant: 'warning',
                title: 'Joylashuv aniqlanmadi',
                description: 'Geolokatsiya ruxsati talab qilinadi.'
              });
              initializeMap(DEFAULT_CENTER);
            }
          );
        } else {
          initializeMap(DEFAULT_CENTER);
        }
      } catch (error) {
        console.error('Map initialization failed:', error);
        addToast({
          variant: 'error',
          title: 'Xarita yuklanmadi',
          description: 'MapLibre kutubxonasini yuklashda xatolik yuz berdi.'
        });
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [addToast, targetStore]);

  const locateMe = () => {
    if (!navigator.geolocation) {
      addToast({
        variant: 'error',
        title: 'Geolokatsiya mavjud emas',
        description: 'Brauzeringiz geolokatsiyani qo\'llab-quvvatlamaydi.'
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.longitude, position.coords.latitude];
        setCurrentLngLat({ lng: coords[0], lat: coords[1] });
        if (markerRef.current) {
          markerRef.current.setLngLat(coords);
        } else if (mapRef.current && maplibreRef.current) {
          markerRef.current = new maplibreRef.current.Marker({ color: '#007AFF' })
            .setLngLat(coords)
            .addTo(mapRef.current);
        }
        mapRef.current?.flyTo({ center: coords, zoom: 14, speed: 0.8 });
      },
      () => {
        addToast({
          variant: 'warning',
          title: 'Ruxsat berilmadi',
          description: 'Geolokatsiya olish uchun ruxsat bermadingiz.'
        });
      }
    );
  };

  const handleSave = () => {
    if (!currentLngLat || !targetStore) {
      addToast({
        variant: 'warning',
        title: 'Manzil tanlanmadi',
        description: 'Iltimos, xaritada kerakli nuqtani belgilang.'
      });
      return;
    }

    updateStore(targetStore.id, {
      coordinates: [currentLngLat.lng, currentLngLat.lat],
      lastVisit: new Date().toISOString()
    });

    addToast({
      variant: 'success',
      title: 'Joylashuv saqlandi',
      description: `${targetStore.title} uchun koordinatalar yangilandi.`
    });
  };

  return (
    <main className="page map-page">
      <div className="map-container">
        <div className="map-info glass-panel">
          <h2>{targetStore?.title ?? 'Do\'kon tanlanmagan'}</h2>
          <p>{targetStore?.address ?? 'Manzilni tanlang'}</p>
          {currentLngLat ? (
            <span className="coords">
              {currentLngLat.lat.toFixed(5)}, {currentLngLat.lng.toFixed(5)}
            </span>
          ) : (
            <span className="coords muted">Koordinatalar kutilmoqda</span>
          )}
        </div>
        <div ref={mapContainerRef} className="maplibre-view" />
        <div className="map-controls">
          <button type="button" className="btn-glass" onClick={locateMe}>
            <span className="material-symbols-rounded">my_location</span>
            Mening joylashuvim
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <span className="material-symbols-rounded">done_all</span>
            Saqlash
          </button>
        </div>
      </div>
      {loading && <div className="loading-state">Xarita yuklanmoqda...</div>}
    </main>
  );
}
