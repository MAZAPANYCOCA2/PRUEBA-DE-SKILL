/* Datos de los 118 elementos (masas atómicas estándar IUPAC, abreviadas).
   Formato: símbolo|nombre|masa|grupo|periodo|categoría. Grupo 0 = lantánido/actínido. */
(function () {
  'use strict';
  const RAW = `H|Hidrógeno|1.008|1|1|nm
He|Helio|4.0026|18|1|ng
Li|Litio|6.94|1|2|am
Be|Berilio|9.0122|2|2|ae
B|Boro|10.81|13|2|md
C|Carbono|12.011|14|2|nm
N|Nitrógeno|14.007|15|2|nm
O|Oxígeno|15.999|16|2|nm
F|Flúor|18.998|17|2|ha
Ne|Neón|20.180|18|2|ng
Na|Sodio|22.990|1|3|am
Mg|Magnesio|24.305|2|3|ae
Al|Aluminio|26.982|13|3|pt
Si|Silicio|28.085|14|3|md
P|Fósforo|30.974|15|3|nm
S|Azufre|32.06|16|3|nm
Cl|Cloro|35.45|17|3|ha
Ar|Argón|39.948|18|3|ng
K|Potasio|39.098|1|4|am
Ca|Calcio|40.078|2|4|ae
Sc|Escandio|44.956|3|4|tm
Ti|Titanio|47.867|4|4|tm
V|Vanadio|50.942|5|4|tm
Cr|Cromo|51.996|6|4|tm
Mn|Manganeso|54.938|7|4|tm
Fe|Hierro|55.845|8|4|tm
Co|Cobalto|58.933|9|4|tm
Ni|Níquel|58.693|10|4|tm
Cu|Cobre|63.546|11|4|tm
Zn|Zinc|65.38|12|4|tm
Ga|Galio|69.723|13|4|pt
Ge|Germanio|72.630|14|4|md
As|Arsénico|74.922|15|4|md
Se|Selenio|78.971|16|4|nm
Br|Bromo|79.904|17|4|ha
Kr|Kriptón|83.798|18|4|ng
Rb|Rubidio|85.468|1|5|am
Sr|Estroncio|87.62|2|5|ae
Y|Itrio|88.906|3|5|tm
Zr|Circonio|91.224|4|5|tm
Nb|Niobio|92.906|5|5|tm
Mo|Molibdeno|95.95|6|5|tm
Tc|Tecnecio|98|7|5|tm
Ru|Rutenio|101.07|8|5|tm
Rh|Rodio|102.91|9|5|tm
Pd|Paladio|106.42|10|5|tm
Ag|Plata|107.87|11|5|tm
Cd|Cadmio|112.41|12|5|tm
In|Indio|114.82|13|5|pt
Sn|Estaño|118.71|14|5|pt
Sb|Antimonio|121.76|15|5|md
Te|Telurio|127.60|16|5|md
I|Yodo|126.90|17|5|ha
Xe|Xenón|131.29|18|5|ng
Cs|Cesio|132.91|1|6|am
Ba|Bario|137.33|2|6|ae
La|Lantano|138.91|0|6|la
Ce|Cerio|140.12|0|6|la
Pr|Praseodimio|140.91|0|6|la
Nd|Neodimio|144.24|0|6|la
Pm|Prometio|145|0|6|la
Sm|Samario|150.36|0|6|la
Eu|Europio|151.96|0|6|la
Gd|Gadolinio|157.25|0|6|la
Tb|Terbio|158.93|0|6|la
Dy|Disprosio|162.50|0|6|la
Ho|Holmio|164.93|0|6|la
Er|Erbio|167.26|0|6|la
Tm|Tulio|168.93|0|6|la
Yb|Iterbio|173.05|0|6|la
Lu|Lutecio|174.97|0|6|la
Hf|Hafnio|178.49|4|6|tm
Ta|Tántalo|180.95|5|6|tm
W|Wolframio|183.84|6|6|tm
Re|Renio|186.21|7|6|tm
Os|Osmio|190.23|8|6|tm
Ir|Iridio|192.22|9|6|tm
Pt|Platino|195.08|10|6|tm
Au|Oro|196.97|11|6|tm
Hg|Mercurio|200.59|12|6|tm
Tl|Talio|204.38|13|6|pt
Pb|Plomo|207.2|14|6|pt
Bi|Bismuto|208.98|15|6|pt
Po|Polonio|209|16|6|pt
At|Astato|210|17|6|ha
Rn|Radón|222|18|6|ng
Fr|Francio|223|1|7|am
Ra|Radio|226|2|7|ae
Ac|Actinio|227|0|7|ac
Th|Torio|232.04|0|7|ac
Pa|Protactinio|231.04|0|7|ac
U|Uranio|238.03|0|7|ac
Np|Neptunio|237|0|7|ac
Pu|Plutonio|244|0|7|ac
Am|Americio|243|0|7|ac
Cm|Curio|247|0|7|ac
Bk|Berkelio|247|0|7|ac
Cf|Californio|251|0|7|ac
Es|Einstenio|252|0|7|ac
Fm|Fermio|257|0|7|ac
Md|Mendelevio|258|0|7|ac
No|Nobelio|259|0|7|ac
Lr|Laurencio|266|0|7|ac
Rf|Rutherfordio|267|4|7|tm
Db|Dubnio|268|5|7|tm
Sg|Seaborgio|269|6|7|tm
Bh|Bohrio|270|7|7|tm
Hs|Hasio|277|8|7|tm
Mt|Meitnerio|278|9|7|tm
Ds|Darmstatio|281|10|7|tm
Rg|Roentgenio|282|11|7|tm
Cn|Copernicio|285|12|7|tm
Nh|Nihonio|286|13|7|pt
Fl|Flerovio|289|14|7|pt
Mc|Moscovio|290|15|7|pt
Lv|Livermorio|293|16|7|pt
Ts|Teneso|294|17|7|ha
Og|Oganesón|294|18|7|ng`;

  const CAT = {
    am: ['metal-alcalino', 'Metal alcalino'], ae: ['alcalinoterreo', 'Metal alcalinotérreo'],
    tm: ['transicion', 'Metal de transición'], pt: ['postransicion', 'Metal del bloque p'],
    md: ['metaloide', 'Metaloide'], nm: ['no-metal', 'No metal'], ha: ['halogeno', 'Halógeno'],
    ng: ['gas-noble', 'Gas noble'], la: ['lantanido', 'Lantánido'], ac: ['actinido', 'Actínido']
  };

  const list = RAW.split('\n').map((l, i) => {
    const [sym, name, mass, group, period, cat] = l.split('|');
    return { z: i + 1, sym, name, mass: parseFloat(mass), group: +group, period: +period, cls: CAT[cat][0], catName: CAT[cat][1] };
  });
  const bySym = Object.fromEntries(list.map(e => [e.sym, e]));
  window.ELEMENTS = { list, bySym };
})();
