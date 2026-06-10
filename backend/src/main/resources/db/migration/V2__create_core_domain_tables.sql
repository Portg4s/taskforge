CREATE TABLE app_users (
    id uuid PRIMARY KEY,
    email varchar(255) NOT NULL,
    display_name varchar(120) NOT NULL,
    password_hash varchar(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT uk_app_users_email UNIQUE (email)
);

CREATE TABLE projects (
    id uuid PRIMARY KEY,
    name varchar(160) NOT NULL,
    description text,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT fk_projects_owner
        FOREIGN KEY (owner_id) REFERENCES app_users (id)
);

CREATE TABLE boards (
    id uuid PRIMARY KEY,
    name varchar(160) NOT NULL,
    project_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT fk_boards_project
        FOREIGN KEY (project_id) REFERENCES projects (id)
);

CREATE TABLE board_columns (
    id uuid PRIMARY KEY,
    name varchar(120) NOT NULL,
    position integer NOT NULL,
    board_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT fk_board_columns_board
        FOREIGN KEY (board_id) REFERENCES boards (id)
);

CREATE TABLE tasks (
    id uuid PRIMARY KEY,
    title varchar(200) NOT NULL,
    description text,
    priority varchar(20) NOT NULL,
    due_date date,
    position integer NOT NULL,
    board_id uuid NOT NULL,
    column_id uuid NOT NULL,
    assignee_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_tasks_priority
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT fk_tasks_board
        FOREIGN KEY (board_id) REFERENCES boards (id),
    CONSTRAINT fk_tasks_column
        FOREIGN KEY (column_id) REFERENCES board_columns (id),
    CONSTRAINT fk_tasks_assignee
        FOREIGN KEY (assignee_id) REFERENCES app_users (id)
);

CREATE INDEX idx_projects_owner_id ON projects (owner_id);
CREATE INDEX idx_boards_project_id ON boards (project_id);
CREATE INDEX idx_board_columns_board_id ON board_columns (board_id);
CREATE INDEX idx_tasks_board_id ON tasks (board_id);
CREATE INDEX idx_tasks_column_id ON tasks (column_id);
CREATE INDEX idx_tasks_assignee_id ON tasks (assignee_id);
