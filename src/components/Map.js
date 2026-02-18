import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Map.css';

// Fix default marker icon in Create React App (webpack)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const DEFAULT_CENTER = [40.7, -74.0];
const DEFAULT_ZOOM = 10;

function FitBounds({ thingsWithCoords }) {
  const map = useMap();
  const coordsKey = thingsWithCoords
    .map((t) => `${t.latitude},${t.longitude}`)
    .join('|');

  useEffect(() => {
    if (thingsWithCoords.length === 0) return;
    if (thingsWithCoords.length === 1) {
      map.setView([thingsWithCoords[0].latitude, thingsWithCoords[0].longitude], 14);
      return;
    }
    const bounds = L.latLngBounds(
      thingsWithCoords.map((thing) => [thing.latitude, thing.longitude])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, coordsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function Map({ things = [] }) {
  const thingsWithCoords = useMemo(
    () =>
      things.filter(
        (thing) =>
          thing.latitude != null &&
          thing.longitude != null &&
          Number.isFinite(thing.latitude) &&
          Number.isFinite(thing.longitude)
      ),
    [things]
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
      <FitBounds thingsWithCoords={thingsWithCoords} />
      {thingsWithCoords.map((thing) => (
        <Marker key={thing.id} position={[thing.latitude, thing.longitude]}>
          <Popup>
            <strong>{thing.name}</strong>
            {thing.description && (
              <>
                <br />
                <span className="map-popup-description">{thing.description}</span>
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default Map;
