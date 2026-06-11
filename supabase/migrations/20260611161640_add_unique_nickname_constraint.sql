create unique index if not exists uq_participants_nickname_ci
	on participants (lower(trim(nickname)))
	where nickname is not null;
