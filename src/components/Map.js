import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon in Create React App (webpack)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const DEFAULT_CENTER = [40.7, -74.0];
const DEFAULT_ZOOM = 10;

function FitBounds({ itemsWithCoords }) {
  const map = useMap();
  const coordsKey = itemsWithCoords
    .map((i) => `${i.latitude},${i.longitude}`)
    .join('|');

  useEffect(() => {
    if (itemsWithCoords.length === 0) return;
    if (itemsWithCoords.length === 1) {
      map.setView([itemsWithCoords[0].latitude, itemsWithCoords[0].longitude], 14);
      return;
    }
    const bounds = L.latLngBounds(
      itemsWithCoords.map((item) => [item.latitude, item.longitude])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, coordsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function Map({ items = [] }) {
  const itemsWithCoords = useMemo(
    () =>
      items.filter(
        (item) =>
          item.latitude != null &&
          item.longitude != null &&
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude)
      ),
    [items]
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom={true}
      className="map-container"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds itemsWithCoords={itemsWithCoords} />
      {itemsWithCoords.map((item) => (
        <Marker key={item.id} position={[item.latitude, item.longitude]}>
          <Popup>
            <strong>{item.name}</strong>
            {item.description && (
              <>
                <br />
                <span className="map-popup-description">{item.description}</span>
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default Map;
