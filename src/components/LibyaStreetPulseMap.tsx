import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  AlertTriangle,
  Flame,
  Activity,
  Filter,
  Eye,
  ExternalLink,
  Sparkles,
  Search,
  Maximize2,
  TrendingUp,
  ShieldAlert,
  Compass,
  FileText,
  Radio,
  Navigation,
  Globe,
  Satellite,
  X
} from 'lucide-react';
import { PopularMoodPost, PublicTensionLevelType } from '../types';
import {
  LIBYAN_CITIES,
  computeCitiesTensionSummaries,
  getTensionColorMeta,
  CityTensionSummary,
  LibyanCity
} from '../lib/libyaGeoData';

interface LibyaStreetPulseMapProps {
  posts: PopularMoodPost[];
  onSelectPost?: (post: PopularMoodPost) => void;
  onFilterByCity?: (cityName: string) => void;
}

export const LibyaStreetPulseMap: React.FC<LibyaStreetPulseMapProps> = ({
  posts,
  onSelectPost,
  onFilterByCity
}) => {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [activePopupSummary, setActivePopupSummary] = useState<CityTensionSummary | null>(null);
  const [tensionFilter, setTensionFilter] = useState<string>('all');
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Compute tension summaries for each Libyan city/hotspot
  const citySummaries = useMemo(() => {
    return computeCitiesTensionSummaries(posts);
  }, [posts]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return citySummaries.filter(summary => {
      if (tensionFilter !== 'all' && summary.tensionLevel !== tensionFilter) {
        return false;
      }
      if (citySearchQuery.trim()) {
        const q = citySearchQuery.trim().toLowerCase();
        const matchesName = summary.city.name.toLowerCase().includes(q);
        const matchesRegion = summary.city.region.toLowerCase().includes(q);
        const matchesAliases = summary.city.aliases.some(a => a.toLowerCase().includes(q));
        if (!matchesName && !matchesRegion && !matchesAliases) return false;
      }
      return true;
    });
  }, [citySummaries, tensionFilter, citySearchQuery]);

  // Selected city summary for detailed drawer
  const selectedSummary = useMemo(() => {
    if (!selectedCityId) return null;
    return citySummaries.find(s => s.city.id === selectedCityId) || null;
  }, [selectedCityId, citySummaries]);

  // Top Tension Hotspots
  const topHotspots = useMemo(() => {
    return [...citySummaries]
      .filter(s => s.postCount > 0)
      .sort((a, b) => b.tensionScore - a.tensionScore)
      .slice(0, 5);
  }, [citySummaries]);

  // Initialize Satellite-Only Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center of Libya on land
      const map = L.map(mapContainerRef.current, {
        center: [28.0, 17.5],
        zoom: 5.8,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false
      });

      // Add Zoom Control
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Primary High-Resolution Satellite Tile Layer (ArcGIS World Imagery)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          subdomains: 'abcd'
        }
      ).addTo(map);

      // Satellite Boundary & City Labels Overlay for precise geographic readability
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          opacity: 0.85
        }
      ).addTo(map);

      // Layer group for markers
      const markerGroup = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = markerGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers: Compact size, semi-transparent, exact anchor positioning (no transform offset)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current) return;

    markersLayerGroupRef.current.clearLayers();

    filteredSummaries.forEach((summary) => {
      const isSelected = selectedCityId === summary.city.id;
      const isCriticalHotspot = summary.tensionLevel === 'احتقان شديد' || summary.tensionLevel === 'توتر مرتفع' || summary.tensionScore >= 65;
      const isModerate = summary.tensionLevel === 'توتر متوسط';
      const colorMeta = getTensionColorMeta(summary.tensionLevel);

      let markerHtml = '';
      let iconSize: [number, number] = [22, 22];
      let iconAnchor: [number, number] = [11, 11];

      if (isCriticalHotspot) {
        iconSize = [24, 24];
        iconAnchor = [12, 12];

        // Compact Semi-Transparent Red Circle with Warning Triangle (▲)
        markerHtml = `
          <div class="relative w-6 h-6 flex items-center justify-center cursor-pointer group">
            <!-- Subtle pulsing alert ring -->
            <span class="absolute inset-0 rounded-full bg-rose-500/40 animate-ping"></span>
            
            <!-- Compact Red Circle with High Transparency -->
            <div class="relative w-5 h-5 rounded-full flex items-center justify-center border border-rose-300/80 bg-rose-600/70 backdrop-blur-sm shadow-[0_0_8px_rgba(225,29,72,0.6)] transition-transform duration-200 ${
              isSelected ? 'scale-125 ring-2 ring-amber-400 bg-rose-600/90' : 'hover:scale-115'
            }">
              <!-- Warning Triangle SVG Icon -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-3 h-3 text-white fill-white drop-shadow">
                <path d="M12 2L1 21h22L12 2zm0 3.8l8.5 14.2H3.5L12 5.8zM11 10h2v5h-2zm0 6h2v2h-2z"/>
              </svg>

              <!-- Post Count Mini Badge -->
              ${summary.postCount > 0 ? `
                <span class="absolute -top-1 -right-1 bg-amber-400/90 text-slate-950 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow font-mono border border-slate-950/60 leading-none">
                  ${summary.postCount}
                </span>
              ` : ''}
            </div>
          </div>
        `;
      } else if (isModerate) {
        iconSize = [18, 18];
        iconAnchor = [9, 9];

        // Compact Transparent Amber Ring
        markerHtml = `
          <div class="relative w-[18px] h-[18px] flex items-center justify-center cursor-pointer group">
            <div class="relative w-4 h-4 rounded-full flex items-center justify-center border border-amber-300/40 bg-amber-500/20 backdrop-blur-sm shadow-[0_0_6px_rgba(245,158,11,0.3)] transition-transform duration-200 ${
              isSelected ? 'scale-125 ring-2 ring-amber-300 bg-amber-500/40' : 'hover:scale-110 hover:bg-amber-500/30'
            }">
              <div class="w-1.5 h-1.5 rounded-full bg-amber-300/80"></div>
              ${summary.postCount > 0 ? `
                <span class="absolute -top-1 -right-1 bg-amber-400/90 text-slate-950 text-[7px] font-bold px-0.5 rounded-full shadow leading-none">
                  ${summary.postCount}
                </span>
              ` : ''}
            </div>
          </div>
        `;
      } else {
        iconSize = [16, 16];
        iconAnchor = [8, 8];

        // Compact Transparent Calm / Blue Circle
        markerHtml = `
          <div class="relative w-4 h-4 flex items-center justify-center cursor-pointer group">
            <div class="relative w-3.5 h-3.5 rounded-full flex items-center justify-center border border-sky-300/30 bg-sky-500/15 backdrop-blur-sm shadow-[0_0_5px_rgba(56,189,248,0.2)] transition-transform duration-200 ${
              isSelected ? 'scale-125 ring-2 ring-sky-300 bg-sky-500/35' : 'hover:scale-110 hover:bg-sky-500/25'
            }">
              <div class="w-1 h-1 rounded-full bg-sky-200/70"></div>
              ${summary.postCount > 0 ? `
                <span class="absolute -top-1 -right-1 bg-sky-400/90 text-slate-950 text-[7px] font-bold px-0.5 rounded-full shadow leading-none">
                  ${summary.postCount}
                </span>
              ` : ''}
            </div>
          </div>
        `;
      }

      const markerIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-pulse-marker',
        iconSize: iconSize,
        iconAnchor: iconAnchor
      });

      const marker = L.marker([summary.city.lat, summary.city.lng], { icon: markerIcon });

      // Compact Leaflet Popup Data Card (اسم المدينة فقط)
      const popupHtml = `
        <div class="p-3 text-right font-sans text-slate-100 min-w-[200px] max-w-[240px]">
          <!-- Card Header: City Name Only -->
          <div class="flex items-center justify-between pb-2 border-b border-slate-700/80 gap-2">
            <div class="flex items-center gap-1.5 font-bold text-sm text-white">
              <span class="w-2 h-2 rounded-full ${isCriticalHotspot ? 'bg-rose-500 animate-ping' : 'bg-sky-400'}"></span>
              <span class="text-base font-black text-amber-400">${summary.city.name}</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold text-white shrink-0" style="background-color: ${colorMeta.hex}">
              ${summary.tensionLevel}
            </span>
          </div>

          <!-- Card Body: Posts Count & Metrics -->
          <div class="py-2 space-y-1.5">
            <div class="flex items-center justify-between text-xs bg-slate-900/90 p-1.5 rounded border border-slate-800">
              <span class="text-slate-400 font-medium">عدد المنشورات:</span>
              <span class="text-amber-400 font-black text-sm font-mono">${summary.postCount} منشور</span>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
              <span>مؤشر الاحتقان:</span>
              <span class="font-mono font-bold text-slate-200">${summary.tensionScore}%</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="h-full rounded-full" style="width: ${summary.tensionScore}%; background-color: ${colorMeta.hex}"></div>
            </div>

            <div class="flex items-center justify-between text-[10px] text-slate-400 px-0.5 pt-0.5">
              <span>النبرة السائدة:</span>
              <span class="text-slate-200 font-bold">${summary.prevailingTone}</span>
            </div>
          </div>

          <!-- Card Footer Action Button -->
          <div class="pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
            <button id="btn-view-city-${summary.city.id}" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold py-1 px-2 rounded flex items-center justify-center gap-1 shadow transition-colors">
              <span>عرض تفاصيل ${summary.city.name}</span>
              <span>←</span>
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        offset: [0, -12],
        closeButton: true,
        autoPan: true
      });

      marker.on('click', () => {
        setSelectedCityId(summary.city.id);
        setActivePopupSummary(summary);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([summary.city.lat, summary.city.lng], 9, {
            duration: 1.0
          });
        }
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-view-city-${summary.city.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            setSelectedCityId(summary.city.id);
            setActivePopupSummary(summary);
          };
        }
      });

      markersLayerGroupRef.current?.addLayer(marker);
    });
  }, [filteredSummaries, selectedCityId]);

  // Focus specific hotspot
  const handleFocusCity = (city: LibyanCity) => {
    setSelectedCityId(city.id);
    const summary = citySummaries.find(s => s.city.id === city.id) || null;
    setActivePopupSummary(summary);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([city.lat, city.lng], 9, {
        duration: 1.2
      });
    }
  };

  // Reset Map View
  const handleResetMapView = () => {
    setSelectedCityId(null);
    setActivePopupSummary(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.closePopup();
      mapInstanceRef.current.flyTo([28.0, 17.5], 5.8, { duration: 1.2 });
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden mb-8">
      {/* Top Header Strip */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Satellite className="w-5 h-5 text-amber-400" />
              <span>خريطة الرصد الفضائي: بؤر الاحتقان ومزاج الشارع الليبي</span>
            </h2>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ستالايت فيو (Satellite)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            رصد مواقع المدن على اليابسة بعلامات مدمجة ذات شفافية عالية ومثلثات تحذيرية حمراء (▲) للبؤر
          </p>
        </div>

        {/* Hotspots Quick Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            أبرز البؤر:
          </span>
          {topHotspots.map(h => {
            const isHighAlert = h.tensionLevel === 'احتقان شديد' || h.tensionLevel === 'توتر مرتفع';
            return (
              <button
                key={h.city.id}
                onClick={() => handleFocusCity(h.city)}
                className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all ${
                  selectedCityId === h.city.id
                    ? 'bg-rose-600 text-white border-rose-400 font-bold shadow-lg ring-2 ring-rose-300'
                    : isHighAlert
                    ? 'bg-rose-950/70 text-rose-200 border-rose-700/80 hover:bg-rose-900/80 backdrop-blur-sm'
                    : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700 backdrop-blur-sm'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-rose-600 flex items-center justify-center text-[7px] text-white font-bold">
                  ▲
                </span>
                <span>{h.city.name}</span>
                <span className="text-[10px] opacity-80 font-mono font-bold bg-black/40 px-1.5 rounded-full">
                  {h.postCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Control Bar & Filters */}
      <div className="bg-slate-950/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Tension Level Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-medium ml-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            مستوى الاحتقان:
          </span>
          {[
            { id: 'all', label: 'كافة المدن' },
            { id: 'احتقان شديد', label: 'احتقان شديد', hex: '#e11d48' },
            { id: 'توتر مرتفع', label: 'توتر مرتفع', hex: '#ea580c' },
            { id: 'توتر متوسط', label: 'توتر متوسط', hex: '#f59e0b' },
            { id: 'هادئ / متزن', label: 'هادئ / متزن', hex: '#38bdf8' },
            { id: 'إيجابي', label: 'إيجابي', hex: '#10b981' }
          ].map(lvl => (
            <button
              key={lvl.id}
              onClick={() => setTensionFilter(lvl.id)}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                tensionFilter === lvl.id
                  ? 'bg-rose-600 text-white shadow-sm font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>

        {/* Search & Reset Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              value={citySearchQuery}
              onChange={e => setCitySearchQuery(e.target.value)}
              placeholder="ابحث عن مدينة..."
              className="w-full bg-slate-900 border border-slate-700 rounded-md pr-8 pl-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2" />
          </div>

          <button
            onClick={handleResetMapView}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 flex items-center gap-1"
            title="إعادة ضبط الرؤية لكامل ليبيا"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">إعادة الضبط</span>
          </button>
        </div>
      </div>

      {/* Main Map + Side Details Drawer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
        {/* Map Container Area */}
        <div className={`transition-all duration-300 ${selectedSummary ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          <div className="w-full relative bg-slate-950" style={{ height: '580px' }}>
            {/* The Satellite Leaflet Map Instance */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Satellite Overlay Indicator */}
            <div className="absolute top-4 right-4 bg-slate-950/85 border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-2xl backdrop-blur-md z-[1000] text-[11px] pointer-events-none flex items-center gap-2">
              <Satellite className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-slate-200 font-semibold">بث الستالايت المباشر (Satellite)</span>
            </div>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 right-4 bg-slate-950/85 border border-slate-700/80 rounded-lg p-2.5 shadow-2xl backdrop-blur-md z-[1000] text-[11px] pointer-events-none">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>دليل الرموز:</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-rose-600/80 border border-rose-300 flex items-center justify-center text-[7px] text-white font-bold shadow">
                    ▲
                  </div>
                  <span className="text-slate-200 font-medium">بؤرة احتقان (شفافة بمثلث)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border border-sky-300/40 bg-sky-500/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-sky-200"></div>
                  </div>
                  <span className="text-slate-300 text-[10px]">موقع اعتيادي (دائرة شفافة مصغرة)</span>
                </div>
              </div>
            </div>

            {/* Floating Mini Data Card on Map when activePopupSummary exists - Only City Name */}
            {activePopupSummary && (
              <div className="absolute top-4 left-4 z-[1000] bg-slate-950/95 border-2 border-amber-500/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-right w-64 max-w-[calc(100%-2rem)] transition-all animate-fadeIn">
                <div className="flex items-start justify-between pb-2 border-b border-slate-700/80">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 flex items-center justify-center text-[7px] text-white">▲</span>
                      <h4 className="font-black text-base text-amber-400">{activePopupSummary.city.name}</h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePopupSummary(null)}
                    className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="py-2 space-y-1.5">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">عدد المنشورات:</span>
                    <span className="text-amber-400 font-black text-sm font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      {activePopupSummary.postCount} منشور
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">درجة الاحتقان:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      activePopupSummary.tensionLevel === 'احتقان شديد' ? 'bg-rose-500 text-white' :
                      activePopupSummary.tensionLevel === 'توتر مرتفع' ? 'bg-orange-500 text-white' :
                      'bg-sky-600 text-white'
                    }`}>
                      {activePopupSummary.tensionLevel} ({activePopupSummary.tensionScore}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>النبرة السائدة:</span>
                    <span className="text-slate-200 font-bold">{activePopupSummary.prevailingTone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCityId(activePopupSummary.city.id)}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors shadow"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>عرض المنشورات</span>
                  </button>
                  {onFilterByCity && (
                    <button
                      onClick={() => onFilterByCity(activePopupSummary.city.name)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-1.5 px-2 rounded-lg border border-slate-700"
                      title="تصفية الجدول العام"
                    >
                      تصفية
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Details Drawer for Selected City - Only City Name */}
        {selectedSummary && (
          <div className="lg:col-span-4 bg-slate-950 border-t lg:border-t-0 lg:border-r border-slate-800 p-4 sm:p-5 flex flex-col h-[580px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-600 border border-white flex items-center justify-center text-[10px] text-white font-bold shadow">
                    ▲
                  </div>
                  <h3 className="text-lg font-black text-amber-400">{selectedSummary.city.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedCityId(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-xs font-bold"
              >
                ✕ إغلاق
              </button>
            </div>

            {/* Tension & Risk Assessment Card */}
            {(() => {
              const meta = getTensionColorMeta(selectedSummary.tensionLevel);
              return (
                <div className={`mt-4 p-3.5 rounded-lg border ${meta.border} bg-slate-900/90 shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-300 font-semibold">حالة المزاج الشعبي:</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${meta.bg} text-white`}>
                      {meta.badge}
                    </span>
                  </div>

                  {/* Tension Progress Bar */}
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>مؤشر الاحتقان الميداني:</span>
                      <span className="font-mono font-bold text-slate-200">{selectedSummary.tensionScore}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{ width: `${selectedSummary.tensionScore}%`, backgroundColor: meta.hex }}
                      />
                    </div>
                  </div>

                  {/* Tone Distribution Breakdown */}
                  <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-slate-800/80 text-center text-[10px]">
                    <div className="bg-rose-950/40 border border-rose-800/40 p-1 rounded">
                      <span className="text-rose-400 block font-bold">{selectedSummary.toneBreakdown.inciting}</span>
                      <span className="text-slate-400">تحريضي</span>
                    </div>
                    <div className="bg-orange-950/40 border border-orange-800/40 p-1 rounded">
                      <span className="text-orange-400 block font-bold">{selectedSummary.toneBreakdown.opposing}</span>
                      <span className="text-slate-400">معارض</span>
                    </div>
                    <div className="bg-emerald-950/40 border border-emerald-800/40 p-1 rounded">
                      <span className="text-emerald-400 block font-bold">{selectedSummary.toneBreakdown.supportive}</span>
                      <span className="text-slate-400">داعم</span>
                    </div>
                    <div className="bg-blue-950/40 border border-blue-800/40 p-1 rounded">
                      <span className="text-blue-400 block font-bold">{selectedSummary.toneBreakdown.neutral}</span>
                      <span className="text-slate-400">محايد</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Monitored Posts in this City */}
            <div className="mt-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>المنشورات المرصودة في {selectedSummary.city.name} ({selectedSummary.posts.length})</span>
                </span>
                {onFilterByCity && (
                  <button
                    onClick={() => onFilterByCity(selectedSummary.city.name)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
                  >
                    تصفية الجدول
                  </button>
                )}
              </div>

              <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
                {selectedSummary.posts.length === 0 ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 text-center text-xs text-slate-400">
                    <ShieldAlert className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                    <p>لا توجد منشورات متوترة مسجلة حالياً في {selectedSummary.city.name}.</p>
                    <p className="text-[10px] text-slate-500 mt-1">الوضع الميداني مستقر وتحت الرصد الدوري.</p>
                  </div>
                ) : (
                  selectedSummary.posts.map(post => (
                    <div
                      key={post.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-3 text-xs transition-all shadow-sm group"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-bold text-slate-200 truncate max-w-[170px]">
                          {post.publisher || post.accountName}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            post.tone === 'تحريضي'
                              ? 'bg-rose-900/70 text-rose-300 border border-rose-700'
                              : post.tone === 'معارض'
                              ? 'bg-orange-900/70 text-orange-300 border border-orange-700'
                              : post.tone === 'داعم'
                              ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-700'
                              : 'bg-blue-900/70 text-blue-300 border border-blue-700'
                          }`}
                        >
                          {post.tone || 'محايد'}
                        </span>
                      </div>

                      <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3 mb-2">
                        {post.executiveSummary || post.content}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                        <span className="font-mono">
                          {new Date(post.pubDate).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-2">
                          {onSelectPost && (
                            <button
                              onClick={() => onSelectPost(post)}
                              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              عرض التحليل
                            </button>
                          )}
                          {post.link && (
                            <a
                              href={post.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-slate-200 flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              الأصل
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 flex items-center justify-center text-[7px] text-white font-bold">▲</span>
            <span>بؤر احتقان شديد: {citySummaries.filter(s => s.tensionLevel === 'احتقان شديد').length} مدن</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>توتر مرتفع: {citySummaries.filter(s => s.tensionLevel === 'توتر مرتفع').length} مدن</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400/40 border border-sky-300/60" />
            <span>مستقر / هادئ: {citySummaries.filter(s => s.tensionLevel === 'هادئ / متزن').length} مدن</span>
          </span>
        </div>

        <span className="text-slate-500 font-mono">
          إجمالي المدن المرصودة: {filteredSummaries.length} مدينة
        </span>
      </div>
    </div>
  );
};
