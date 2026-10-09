"""Genereert js/map-nl.js (SVG-paden) uit GeoJSON-bronnen.

Gebruik:
  python3 tools/build_map.py <provincies.geojson> <ne_10m_admin_0_countries.geojson> js/map-nl.js

Bronnen:
  provincies: https://raw.githubusercontent.com/cartomap/nl/gh-pages/wgs84/provincie_2022.geojson (CBS/PDOK)
  landen:     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
"""
import json, math, sys

LON0, LON1, LAT0, LAT1 = 2.95, 7.85, 50.45, 53.72
K = 300.0
COS = math.cos(math.radians(52.1))
W = round((LON1 - LON0) * COS * K)
H = round((LAT1 - LAT0) * K)

def proj(lon, lat):
    return ((lon - LON0) * COS * K, (LAT1 - lat) * K)

def clip(poly, xmin, ymin, xmax, ymax):
    """Sutherland-Hodgman clipping van een ring tegen een rechthoek."""
    def edge(pts, inside, inter):
        out = []
        for i in range(len(pts)):
            a, b = pts[i - 1], pts[i]
            if inside(b):
                if not inside(a): out.append(inter(a, b))
                out.append(b)
            elif inside(a):
                out.append(inter(a, b))
        return out
    def ix(x):
        return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))
    def iy(y):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y)
    pts = poly
    for inside, inter in [
        (lambda p: p[0] >= xmin, ix(xmin)), (lambda p: p[0] <= xmax, ix(xmax)),
        (lambda p: p[1] >= ymin, iy(ymin)), (lambda p: p[1] <= ymax, iy(ymax))]:
        if not pts: break
        pts = edge(pts, inside, inter)
    return pts

def dp(pts, tol):
    """Douglas-Peucker vereenvoudiging."""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        s, e = stack.pop()
        ax, ay = pts[s]; bx, by = pts[e]
        dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy)
        best, bi = 0, -1
        for i in range(s + 1, e):
            if L < 1e-6:  # gesloten ring: afstand tot beginpunt
                d = math.hypot(pts[i][0] - ax, pts[i][1] - ay)
            else:
                d = abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / L
            if d > best: best, bi = d, i
        if best > tol:
            keep[bi] = True; stack += [(s, bi), (bi, e)]
    return [p for p, k in zip(pts, keep) if k]

def rings(geom):
    if geom['type'] == 'Polygon': yield from geom['coordinates']
    else:
        for poly in geom['coordinates']: yield from poly

def to_path(geom, tol, do_clip=False):
    parts = []
    m = 700
    for ring in rings(geom):
        pts = [proj(*c[:2]) for c in ring]
        if do_clip:
            pts = clip(pts, -m, -m, W + m, H + m)
        if pts and pts[0] != pts[-1]: pts = pts + [pts[0]]
        pts = dp(pts, tol)
        if len(pts) < 4: continue
        parts.append('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts[:-1]) + 'Z')
    return ''.join(parts)

def main(prov_file, countries_file, out_file):
    prov = json.load(open(prov_file, encoding='utf-8'))
    regions = {}
    for f in prov['features']:
        regions[f['properties']['statcode']] = to_path(f['geometry'], 0.4)
    ctry = json.load(open(countries_file, encoding='utf-8'))
    lands = {}
    for f in ctry['features']:
        iso = f['properties'].get('ADM0_A3')
        if iso in ('DEU', 'BEL', 'NLD', 'FRA', 'LUX'):
            p = to_path(f['geometry'], 0.6, do_clip=True)
            if p: lands[iso] = p
    data = {'width': W, 'height': H,
            'proj': {'lon0': LON0, 'lat1': LAT1, 'cos': COS, 'k': K},
            'regions': regions, 'lands': lands}
    with open(out_file, 'w', encoding='utf-8') as fh:
        fh.write('// Gegenereerd door tools/build_map.py — niet met de hand bewerken.\n')
        fh.write('window.MAP_NL = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(out_file, W, H, sum(len(v) for v in regions.values()), sum(len(v) for v in lands.values()))

if __name__ == '__main__':
    main(*sys.argv[1:4])
