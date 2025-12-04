import { useState, useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MetricConfig {
  key: string;
  label: string;
  invert: boolean;
  defaultIncluded: boolean;
}

interface Breed {
  Breed: string;
  _hypo: string;
  _lifespan: string;
  _image: string;
  _average: number;
  [key: string]: string | number;
}

const metricsConfig: MetricConfig[] = [
  { key: 'Playfulness', label: 'Playfulness', invert: false, defaultIncluded: true },
  { key: 'Sociability', label: 'Sociability', invert: false, defaultIncluded: true },
  { key: 'Independence', label: 'Independence', invert: false, defaultIncluded: true },
  { key: 'Energy', label: 'Energy Level', invert: false, defaultIncluded: false },
  { key: 'Intelligence', label: 'Intelligence', invert: false, defaultIncluded: true },
  { key: 'GoodAlone', label: 'Good Alone', invert: false, defaultIncluded: true },
  { key: 'GoodWithCats', label: 'Good with Cats', invert: false, defaultIncluded: false },
  { key: 'Neediness', label: 'Neediness (lower is better)', invert: true, defaultIncluded: true },
  { key: 'Vocalization', label: 'Vocalization (lower is better)', invert: true, defaultIncluded: true },
  { key: 'ChildFriendly', label: 'Child-Friendly', invert: false, defaultIncluded: false },
  { key: 'DogFriendly', label: 'Dog-Friendly', invert: false, defaultIncluded: false },
  { key: 'Shedding', label: 'Shedding (lower is better)', invert: true, defaultIncluded: false },
  { key: 'Grooming', label: 'Grooming Needs', invert: false, defaultIncluded: false },
  { key: 'Price', label: 'Price Range', invert: false, defaultIncluded: false },
];

function parseCSV(text: string): Breed[] {
  const lines = text.trim().split('\n');
  const header = lines[0].split(',');
  return lines.slice(1).map(line => {
    const parts = line.split(',');
    const obj: Record<string, string | number> = {};
    header.forEach((h, i) => {
      obj[h] = parts[i];
    });
    metricsConfig.forEach(m => {
      obj[m.key] = Number(obj[m.key]);
    });
    return {
      ...obj,
      _hypo: obj['Hypoallergenic'] as string,
      _lifespan: obj['Lifespan'] as string,
      _image: obj['ImageURL'] as string,
      _average: 0,
    } as Breed;
  });
}

const CatComparison = () => {
  const [allBreeds, setAllBreeds] = useState<Breed[]>([]);
  const [visibleBreeds, setVisibleBreeds] = useState<Breed[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(metricsConfig.filter(m => m.defaultIncluded).map(m => m.key))
  );
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'Average',
    direction: 'desc',
  });
  const [modalImage, setModalImage] = useState<string | null>(null);

  const computeAverage = (breed: Breed, metrics: Set<string>) => {
    if (metrics.size === 0) return 0;
    let sum = 0;
    let count = 0;
    metrics.forEach(key => {
      const metric = metricsConfig.find(m => m.key === key);
      if (!metric) return;
      let val = Number(breed[key]);
      if (!isFinite(val)) return;
      if (metric.invert) {
        val = 6 - val;
      }
      sum += val;
      count += 1;
    });
    return count > 0 ? +(sum / count).toFixed(1) : 0;
  };

  useEffect(() => {
    fetch('/data/breeds.csv')
      .then(res => res.text())
      .then(text => {
        const breeds = parseCSV(text);
        breeds.forEach(b => {
          b._average = computeAverage(b, selectedMetrics);
        });
        setAllBreeds(breeds);
        setVisibleBreeds(breeds);
      });
  }, []);

  const sortedBreeds = useMemo(() => {
    const sorted = [...visibleBreeds];
    const { key, direction } = sortConfig;

    sorted.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (key === 'Breed') {
        aVal = a.Breed;
        bVal = b.Breed;
      } else if (key === 'Hypoallergenic') {
        aVal = a._hypo;
        bVal = b._hypo;
      } else if (key === 'Lifespan') {
        aVal = a._lifespan;
        bVal = b._lifespan;
      } else if (key === 'Average') {
        aVal = a._average;
        bVal = b._average;
      } else {
        aVal = Number(a[key]);
        bVal = Number(b[key]);
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      const numA = Number(aVal);
      const numB = Number(bVal);
      if (!isFinite(numA) && !isFinite(numB)) return 0;
      if (!isFinite(numA)) return 1;
      if (!isFinite(numB)) return -1;
      return direction === 'asc' ? numA - numB : numB - numA;
    });

    return sorted;
  }, [visibleBreeds, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleMetricToggle = (key: string) => {
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const recalculateAverages = () => {
    const updated = visibleBreeds.map(b => ({
      ...b,
      _average: computeAverage(b, selectedMetrics),
    }));
    setVisibleBreeds(updated);
    setAllBreeds(prev => prev.map(b => ({
      ...b,
      _average: computeAverage(b, selectedMetrics),
    })));
  };

  const restoreAllBreeds = () => {
    const restored = allBreeds.map(b => ({
      ...b,
      _average: computeAverage(b, selectedMetrics),
    }));
    setVisibleBreeds(restored);
  };

  const removeBreed = (breed: Breed) => {
    setVisibleBreeds(prev => prev.filter(b => b.Breed !== breed.Breed));
  };

  const getRatingClass = (value: number, metricKey: string) => {
    const metric = metricsConfig.find(m => m.key === metricKey);
    let effective = value;
    if (metric?.invert) {
      effective = 6 - value;
    }
    if (effective >= 4.5) return 'bg-green-100 text-green-800';
    if (effective <= 2) return 'bg-red-100 text-red-800';
    return 'bg-indigo-50 text-indigo-900';
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  return (
    <div 
      className="min-h-screen p-4"
      style={{ background: 'radial-gradient(circle at top, #667eea 0, #764ba2 40%, #111827 100%)' }}
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <header className="bg-white/95 rounded-2xl p-4 md:p-5 shadow-xl mb-4">
          <h1 className="text-2xl md:text-3xl font-bold m-0 mb-1">🐱 Cat Breed Comparison</h1>
          <p className="text-sm text-gray-600 m-0">
            Playful, social & independent-friendly cat breeds – compare by traits you care about.
          </p>
        </header>

        {/* Controls */}
        <section className="bg-slate-50/98 rounded-2xl p-4 md:p-5 shadow-lg mb-4">
          <h2 className="text-lg font-semibold mt-0 mb-1">Average Score Settings</h2>
          <p className="text-sm text-gray-600 mb-3">
            Select which traits to include in the overall score. Some traits are inverted automatically
            (lower Neediness, Vocalization & Shedding count as better).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
            {metricsConfig.map(m => (
              <div key={m.key} className="flex items-center gap-2">
                <Checkbox
                  id={`metric_${m.key}`}
                  checked={selectedMetrics.has(m.key)}
                  onCheckedChange={() => handleMetricToggle(m.key)}
                />
                <label htmlFor={`metric_${m.key}`} className="text-sm text-gray-700 cursor-pointer">
                  {m.label.replace(' (lower is better)', '')}
                </label>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={recalculateAverages} className="rounded-full">
              🔄 Recalculate Averages
            </Button>
            <Button onClick={restoreAllBreeds} variant="secondary" className="rounded-full">
              ↩️ Restore All Breeds
            </Button>
          </div>
        </section>

        {/* Table */}
        <section className="bg-slate-50/98 rounded-2xl p-2 md:p-3 shadow-xl">
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full min-w-[1150px] bg-white border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th 
                    className="sticky left-0 z-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 text-left text-sm font-semibold cursor-pointer select-none"
                    onClick={() => handleSort('Breed')}
                  >
                    Breed <span className="text-xs opacity-70 ml-1">{getSortIndicator('Breed')}</span>
                  </th>
                  {metricsConfig.map(m => (
                    <th
                      key={m.key}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
                      onClick={() => handleSort(m.key)}
                    >
                      {m.label.replace(' (lower is better)', '')}
                      <span className="text-xs opacity-70 ml-1">{getSortIndicator(m.key)}</span>
                    </th>
                  ))}
                  <th
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 text-left text-xs font-semibold cursor-pointer select-none"
                    onClick={() => handleSort('Hypoallergenic')}
                  >
                    Hypo <span className="text-xs opacity-70 ml-1">{getSortIndicator('Hypoallergenic')}</span>
                  </th>
                  <th
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 text-left text-xs font-semibold cursor-pointer select-none"
                    onClick={() => handleSort('Lifespan')}
                  >
                    Lifespan <span className="text-xs opacity-70 ml-1">{getSortIndicator('Lifespan')}</span>
                  </th>
                  <th
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 text-left text-xs font-semibold cursor-pointer select-none"
                    onClick={() => handleSort('Average')}
                  >
                    Average <span className="text-xs opacity-70 ml-1">{getSortIndicator('Average')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedBreeds.map(breed => (
                  <tr key={breed.Breed} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="sticky left-0 bg-white p-2">
                      <div className="flex items-center gap-2 max-w-[260px]">
                        <div className="relative group flex-shrink-0">
                          <img
                            src={breed._image}
                            alt={breed.Breed}
                            className="w-12 h-12 rounded-xl object-cover shadow cursor-zoom-in"
                            onClick={() => setModalImage(breed._image)}
                          />
                          <img
                            src={breed._image}
                            alt={breed.Breed}
                            className="hidden md:block absolute top-[-6px] left-14 w-40 h-40 rounded-2xl object-cover shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none"
                          />
                        </div>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(breed.Breed + ' cat')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sm text-gray-900 hover:text-indigo-600 hover:underline"
                        >
                          {breed.Breed}
                        </a>
                        <button
                          onClick={() => removeBreed(breed)}
                          className="ml-auto bg-red-100 text-red-700 rounded-full text-xs px-2 py-1 hover:bg-red-200"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                    {metricsConfig.map(m => (
                      <td key={m.key} className="p-2 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${getRatingClass(Number(breed[m.key]), m.key)}`}>
                          {breed[m.key]}/5
                        </span>
                      </td>
                    ))}
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${breed._hypo === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {breed._hypo}
                      </span>
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">{breed._lifespan}</td>
                    <td className="p-2">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600">
                        {breed._average.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Image Modal */}
      <Dialog open={!!modalImage} onOpenChange={() => setModalImage(null)}>
        <DialogContent className="max-w-[80vw] max-h-[80vh] p-0 bg-transparent border-none shadow-none">
          {modalImage && (
            <img
              src={modalImage}
              alt="Cat breed"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatComparison;
