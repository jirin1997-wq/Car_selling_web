-- Práva pro administrační stránku. Spusťte v Supabase: SQL Editor → New query → Run.
-- Předpoklad: účet s e-mailem níže existuje (Authentication → Users → Add user).

-- Admin vidí i neaktivní vozy a může je přidávat, upravovat a mazat.
-- Ostatní přihlášení uživatelé nemají žádná práva. Anonymní čtení řeší původní politika.

create policy "Admin čte všechna vozidla"
  on public.cars for select to authenticated
  using ((auth.jwt() ->> 'email') = 'vernerova.bara@gmail.com');

create policy "Admin vkládá vozidla"
  on public.cars for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'vernerova.bara@gmail.com');

create policy "Admin upravuje vozidla"
  on public.cars for update to authenticated
  using ((auth.jwt() ->> 'email') = 'vernerova.bara@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'vernerova.bara@gmail.com');

create policy "Admin maže vozidla"
  on public.cars for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'vernerova.bara@gmail.com');
