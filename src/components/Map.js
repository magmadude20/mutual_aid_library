import { useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const DEFAULT_CENTER = [45, -93];
const DEFAULT_ZOOM = 10;

function FitBounds({ markers }) {
  const map = useMap();
  const coordsKey = markers.map((m) => `${m.latitude},${m.longitude}`).join('|');

  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 14);
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, coordsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** markers = [{ userId, latitude, longitude, fullName, things }] */
function Map({ markers = [] }) {
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
      <FitBounds markers={markers} />
      {markers.map((marker) => (
        <Marker key={marker.userId} position={[marker.latitude, marker.longitude]}>
          <Popup>
            {marker.fullName && <strong>{marker.fullName}</strong>}
            {marker.things?.length > 0 && (
              <>
                {marker.fullName && <br />}
                <span className="map-popup-description">
                  {marker.things.map((t) => t.name).join(', ')}
                </span>
              </>
            )}
            <br />
            <Link to={`/user/${marker.userId}`} className="map-popup-link">
              View all things
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default Map;
