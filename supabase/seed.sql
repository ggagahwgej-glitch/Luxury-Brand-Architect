-- ============================================================================
--  OPTIONAL SEED
--  Creates no properties and no testimonials — a production deployment starts
--  empty on purpose. Edit the brand and contact defaults here if you prefer to
--  provision them in SQL instead of through the Studio UI.
-- ============================================================================

update public.site_settings
set branding = jsonb_build_object(
      'businessName', 'Aurum Estates',
      'websiteName', 'Aurum Estates',
      'tagline', 'Private Real Estate Atelier',
      'description', 'Aurum Estates represents a considered collection of private residences, estates and investment addresses.',
      'logoUrl', null,
      'faviconUrl', null
    ),
    contact = jsonb_build_object(
      'phone', '+91 98640 21000',
      'whatsapp', '+91 98640 21000',
      'email', 'private@aurumestates.com',
      'address', 'Level 9, Aurum House, G.S. Road, Guwahati 781005, Assam, India',
      'mapUrl', null,
      'hours', 'Mon – Sat · 9:30 to 19:00 IST'
    ),
    social = jsonb_build_object('facebook', '', 'instagram', '', 'linkedin', '', 'youtube', ''),
    website = jsonb_build_object(
      'heroHeading', 'Where Exceptional Living Meets Timeless Elegance.',
      'heroDescription', 'Explore exceptional residences, prestigious addresses and remarkable investment opportunities.'
    ),
    seo = jsonb_build_object(
      'title', 'Aurum Estates — Luxury Real Estate & Private Residences',
      'description', 'Discover exceptional villas, penthouses, estates and investment addresses with Aurum Estates.'
    ),
    design = jsonb_build_object('accent', 'imperial_gold', 'displayFont', 'cormorant'),
    testimonials = '[]'::jsonb
where id = 1;
