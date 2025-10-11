import React, { useEffect, useRef, useState } from 'react';
import          ],
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm'
            }
          ]
        },
        center: center,
        zoom: 13,
        maxZoom: 18,
        minZoom: 5
      });

      mapRef.current.on('load', () => {
        if (!isMounted) return;
        
        // Add map controls
        mapRef.current.addControl(new maplibreRef.current.NavigationControl(), 'top-right');
        mapRef.current.addControl(new maplibreRef.current.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }), 'top-right');

        // Add click handler for location selection
        mapRef.current.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          updateMarker([lng, lat]);
        });

        setLoading(false);
      });

      // Add marker if store location exists
      if (storeId && currentLngLat) {
        updateMarker(currentLngLat);
      }
    };ocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import clsx from 'clsx';

const DEFAULT_CENTER = [69.22, 41.32];

export default function MapPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const maplibreRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentLngLat, setCurrentLngLat] = useState(null);
  const { showToast } = useApp();
  const location = useLocation();
  const storeId = location.state?.storeId;

  useEffect(() => {
    let isMounted = true;
    let maplibre;

    const initMap = async () => {
      try {
        maplibre = await import('maplibre-gl');
        if (!mapContainerRef.current || !isMounted) return;
        maplibreRef.current = maplibre;

        // Get user's location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { longitude, latitude } = position.coords;
              setCurrentLngLat([longitude, latitude]);
              initializeMap([longitude, latitude]);
            },
            () => {
              showToast("Joylashuvni aniqlashda xatolik", "error");
              initializeMap(DEFAULT_CENTER);
            }
          );
        } else {
          initializeMap(DEFAULT_CENTER);
        }
      } catch (error) {
        console.error('Map initialization failed:', error);
        showToast("Xaritani yuklashda xatolik yuz berdi", "error");
      }
    };

    const initializeMap = (center) => {
      mapRef.current = new maplibreRef.current.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
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
        center: targetStore?.coordinates ?? DEFAULT_CENTER,
        zoom: 12,
        pitch: 20
      });

      mapRef.current.addControl(new maplibre.NavigationControl(), 'top-right');

      mapRef.current.on('load', () => {
        setLoading(false);
        if (targetStore?.coordinates) {
          markerRef.current = new maplibre.Marker({ color: '#007AFF' })
            .setLngLat(targetStore.coordinates)
            .addTo(mapRef.current);
          setCurrentLngLat({
            lng: targetStore.coordinates[0],
            lat: targetStore.coordinates[1]
          });
        }
      });

      mapRef.current.on('click', (event) => {
        const coords = [event.lngLat.lng, event.lngLat.lat];
        setCurrentLngLat({ lng: coords[0], lat: coords[1] });
          if (markerRef.current) {
            markerRef.current.setLngLat(coords);
          } else {
            markerRef.current = new maplibre.Marker({ color: '#007AFF' })
              .setLngLat(coords)
              .addTo(mapRef.current);
          }
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      });
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [targetStore]);

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
    updateStore({
      id: targetStore.id,
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
              {currentLngLat.lat.toFixed(5)} · {currentLngLat.lng.toFixed(5)}
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
