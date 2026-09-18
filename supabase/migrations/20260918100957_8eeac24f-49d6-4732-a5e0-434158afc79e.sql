CREATE TYPE public.app_role AS ENUM ('admin','rider','passenger');
CREATE TYPE public.ride_service AS ENUM ('moto','fetch','plus');
CREATE TYPE public.ride_status AS ENUM ('requested','accepted','ongoing','completed','cancelled');
CREATE TYPE public.pay_method AS ENUM ('gcash','cash');
CREATE TYPE public.pay_status AS ENUM ('unpaid','paid');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  phone TEXT,
  gcash_number TEXT,
  moto_model TEXT,
  plate_number TEXT,
  bio TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  rating_count INTEGER NOT NULL DEFAULT 0,
  trips_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_read" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_insert_own" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role <> 'admin');

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service public.ride_service NOT NULL DEFAULT 'moto',
  pickup_label TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  dropoff_label TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,
  errand_note TEXT,
  fare_cents INTEGER NOT NULL DEFAULT 0,
  payment_method public.pay_method NOT NULL DEFAULT 'gcash',
  payment_status public.pay_status NOT NULL DEFAULT 'unpaid',
  payment_reference TEXT,
  status public.ride_status NOT NULL DEFAULT 'requested',
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.rides TO authenticated;
GRANT ALL ON public.rides TO service_role;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rides_read_own" ON public.rides FOR SELECT TO authenticated
  USING (auth.uid() = passenger_id OR auth.uid() = rider_id OR (status = 'requested' AND public.has_role(auth.uid(),'rider')));
CREATE POLICY "rides_insert_passenger" ON public.rides FOR INSERT TO authenticated WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "rides_update_passenger" ON public.rides FOR UPDATE TO authenticated
  USING (auth.uid() = passenger_id) WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "rides_update_rider" ON public.rides FOR UPDATE TO authenticated
  USING (auth.uid() = rider_id OR (status = 'requested' AND public.has_role(auth.uid(),'rider')))
  WITH CHECK (auth.uid() = rider_id);

CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL UNIQUE REFERENCES public.rides(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_read" ON public.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ratings_insert_own" ON public.ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id AND EXISTS (
    SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.passenger_id = auth.uid() AND r.rider_id = rider_id AND r.status = 'completed'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, photo_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'passenger'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.refresh_rider_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles p SET
    rating_avg = COALESCE((SELECT ROUND(AVG(stars)::numeric,2) FROM public.ratings WHERE rider_id = NEW.rider_id), 5.00),
    rating_count = (SELECT COUNT(*) FROM public.ratings WHERE rider_id = NEW.rider_id),
    updated_at = now()
  WHERE p.id = NEW.rider_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_rating_created AFTER INSERT ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.refresh_rider_rating();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX rides_status_idx ON public.rides (status, created_at DESC);
CREATE INDEX rides_passenger_idx ON public.rides (passenger_id, created_at DESC);
CREATE INDEX rides_rider_idx ON public.rides (rider_id, created_at DESC);