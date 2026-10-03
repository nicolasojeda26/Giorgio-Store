-- Datos de ejemplo. Generado con `npm run seed:build` desde src/data: no editar a mano.
-- Se puede ejecutar más de una vez: actualiza lo que ya existe.

insert into public.promos (slug, name, title, detail, description, quantity, price, art, featured, active, position) values
  ('2-perfumes-100-ml', '2 perfumes', '2 perfumes 100 ml', '100 ml', 'Elegí dos perfumes de 100 ml y combinalos como quieras: para vos, para regalar o uno y uno.', 2, 50000, 'duo', true, true, 0),
  ('2-arabes-50-ml', '2 árabes', '2 árabes 50 ml', '50 ml', 'Dos perfumes árabes de 50 ml, intensos y de larga duración.', 2, 35000, 'arabes', false, true, 1),
  ('5-arabes', '5 árabes', '5 árabes', 'Combo', 'Cinco fragancias árabes para ir cambiando todos los días.', 5, 25000, 'cinco', false, true, 2),
  ('decants-3', '3 decants', '3 decants', 'Para probar', 'Tres decants para conocer fragancias nuevas antes de elegir tu favorita.', 3, 25000, 'decants', false, true, 3)
on conflict (slug) do update set
  name = excluded.name, title = excluded.title, detail = excluded.detail, description = excluded.description,
  quantity = excluded.quantity, price = excluded.price, art = excluded.art, featured = excluded.featured,
  active = excluded.active, position = excluded.position;

insert into public.perfumes (slug, name, gender, size, family, notes, bottle_shape, bottle_tone, stock, position) values
  ('noche-de-ambar', 'Noche de Ámbar', 'hombre', '100 ml', 'Oriental', array['Bergamota', 'Lavanda', 'Ámbar']::text[], 'flacon', 'smoke', true, 0),
  ('costa-azul', 'Costa Azul', 'hombre', '100 ml', 'Fresco', array['Limón', 'Notas marinas', 'Cedro']::text[], 'flacon', 'azul', true, 1),
  ('madera-negra', 'Madera Negra', 'hombre', '100 ml', 'Amaderado', array['Pimienta', 'Vetiver', 'Sándalo']::text[], 'flacon', 'amber', true, 2),
  ('cuero-dorado', 'Cuero Dorado', 'hombre', '100 ml', 'Intenso', array['Canela', 'Cuero', 'Vainilla']::text[], 'flacon', 'champagne', true, 3),
  ('verde-urbano', 'Verde Urbano', 'hombre', '100 ml', 'Fresco', array['Menta', 'Geranio', 'Musgo']::text[], 'flacon', 'esmeralda', false, 4),
  ('rosa-tardia', 'Rosa Tardía', 'mujer', '100 ml', 'Floral', array['Pera', 'Rosa', 'Almizcle']::text[], 'round', 'rose', true, 5),
  ('flor-de-sal', 'Flor de Sal', 'mujer', '100 ml', 'Fresco', array['Mandarina', 'Jazmín', 'Sal marina']::text[], 'round', 'champagne', true, 6),
  ('ciruela-y-vainilla', 'Ciruela y Vainilla', 'mujer', '100 ml', 'Dulce', array['Ciruela', 'Flor de azahar', 'Vainilla']::text[], 'round', 'ciruela', true, 7),
  ('jazmin-de-verano', 'Jazmín de Verano', 'mujer', '100 ml', 'Floral', array['Bergamota', 'Jazmín', 'Madera blanca']::text[], 'round', 'amber', true, 8),
  ('almizcle-blanco', 'Almizcle Blanco', 'unisex', '100 ml', 'Limpio', array['Aldehídos', 'Iris', 'Almizcle']::text[], 'round', 'azul', true, 9),
  ('citrico-del-litoral', 'Cítrico del Litoral', 'unisex', '100 ml', 'Cítrico', array['Pomelo', 'Neroli', 'Vetiver']::text[], 'flacon', 'champagne', true, 10),
  ('humo-y-miel', 'Humo y Miel', 'unisex', '100 ml', 'Intenso', array['Azafrán', 'Tabaco', 'Miel']::text[], 'flacon', 'ciruela', true, 11),
  ('oud-del-desierto', 'Oud del Desierto', 'unisex', '50 ml', 'Amaderado', array['Azafrán', 'Oud', 'Ámbar']::text[], 'arabesque', 'smoke', true, 12),
  ('ambar-real', 'Ámbar Real', 'unisex', '50 ml', 'Oriental', array['Canela', 'Ámbar', 'Vainilla']::text[], 'arabesque', 'amber', true, 13),
  ('rosa-de-oriente', 'Rosa de Oriente', 'mujer', '50 ml', 'Floral', array['Lichi', 'Rosa', 'Oud']::text[], 'arabesque', 'rose', true, 14),
  ('sandalo-imperial', 'Sándalo Imperial', 'hombre', '50 ml', 'Amaderado', array['Cardamomo', 'Sándalo', 'Cuero']::text[], 'arabesque', 'champagne', true, 15),
  ('incienso-dorado', 'Incienso Dorado', 'unisex', '50 ml', 'Intenso', array['Pimienta rosa', 'Incienso', 'Pachulí']::text[], 'arabesque', 'smoke', true, 16),
  ('datil-y-miel', 'Dátil y Miel', 'mujer', '50 ml', 'Dulce', array['Dátil', 'Miel', 'Praliné']::text[], 'arabesque', 'ciruela', true, 17),
  ('noche-de-zafiro', 'Noche de Zafiro', 'hombre', '50 ml', 'Fresco', array['Bergamota', 'Lavanda', 'Haba tonka']::text[], 'arabesque', 'azul', true, 18),
  ('jardin-de-jade', 'Jardín de Jade', 'unisex', '50 ml', 'Verde', array['Té verde', 'Jazmín', 'Almizcle']::text[], 'arabesque', 'esmeralda', false, 19),
  ('decant-ambar', 'Ámbar Nocturno', 'hombre', 'Decant', 'Oriental', array['Bergamota', 'Lavanda', 'Ámbar']::text[], 'vial', 'amber', true, 20),
  ('decant-marino', 'Brisa Marina', 'hombre', 'Decant', 'Fresco', array['Limón', 'Notas marinas', 'Cedro']::text[], 'vial', 'azul', true, 21),
  ('decant-rosa', 'Rosa de Seda', 'mujer', 'Decant', 'Floral', array['Pera', 'Rosa', 'Almizcle']::text[], 'vial', 'rose', true, 22),
  ('decant-vainilla', 'Vainilla Negra', 'mujer', 'Decant', 'Dulce', array['Ciruela', 'Flor de azahar', 'Vainilla']::text[], 'vial', 'ciruela', true, 23),
  ('decant-citrico', 'Cítrico Dorado', 'unisex', 'Decant', 'Cítrico', array['Pomelo', 'Neroli', 'Vetiver']::text[], 'vial', 'champagne', true, 24),
  ('decant-jade', 'Té de Jade', 'unisex', 'Decant', 'Verde', array['Té verde', 'Jazmín', 'Almizcle']::text[], 'vial', 'esmeralda', true, 25)
on conflict (slug) do update set
  name = excluded.name, gender = excluded.gender, size = excluded.size, family = excluded.family,
  notes = excluded.notes, bottle_shape = excluded.bottle_shape, bottle_tone = excluded.bottle_tone,
  stock = excluded.stock, position = excluded.position;

insert into public.promo_perfumes (promo_id, perfume_id)
select promos.id, perfumes.id
from (values
  ('2-perfumes-100-ml', 'noche-de-ambar'),
  ('2-perfumes-100-ml', 'costa-azul'),
  ('2-perfumes-100-ml', 'madera-negra'),
  ('2-perfumes-100-ml', 'cuero-dorado'),
  ('2-perfumes-100-ml', 'verde-urbano'),
  ('2-perfumes-100-ml', 'rosa-tardia'),
  ('2-perfumes-100-ml', 'flor-de-sal'),
  ('2-perfumes-100-ml', 'ciruela-y-vainilla'),
  ('2-perfumes-100-ml', 'jazmin-de-verano'),
  ('2-perfumes-100-ml', 'almizcle-blanco'),
  ('2-perfumes-100-ml', 'citrico-del-litoral'),
  ('2-perfumes-100-ml', 'humo-y-miel'),
  ('2-arabes-50-ml', 'oud-del-desierto'),
  ('5-arabes', 'oud-del-desierto'),
  ('2-arabes-50-ml', 'ambar-real'),
  ('5-arabes', 'ambar-real'),
  ('2-arabes-50-ml', 'rosa-de-oriente'),
  ('5-arabes', 'rosa-de-oriente'),
  ('2-arabes-50-ml', 'sandalo-imperial'),
  ('5-arabes', 'sandalo-imperial'),
  ('2-arabes-50-ml', 'incienso-dorado'),
  ('5-arabes', 'incienso-dorado'),
  ('2-arabes-50-ml', 'datil-y-miel'),
  ('5-arabes', 'datil-y-miel'),
  ('2-arabes-50-ml', 'noche-de-zafiro'),
  ('5-arabes', 'noche-de-zafiro'),
  ('2-arabes-50-ml', 'jardin-de-jade'),
  ('5-arabes', 'jardin-de-jade'),
  ('decants-3', 'decant-ambar'),
  ('decants-3', 'decant-marino'),
  ('decants-3', 'decant-rosa'),
  ('decants-3', 'decant-vainilla'),
  ('decants-3', 'decant-citrico'),
  ('decants-3', 'decant-jade')
) as pairs (promo_slug, perfume_slug)
join public.promos on promos.slug = pairs.promo_slug
join public.perfumes on perfumes.slug = pairs.perfume_slug
on conflict do nothing;

update public.settings set shipping_zone = 'Corrientes Capital', shipping_cost = 3000, shipping_eta = '24 a 48 h' where id = 1;
