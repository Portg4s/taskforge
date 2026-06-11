package com.taskforge.api.task;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, UUID> {

	List<Task> findByBoardId(UUID boardId);

	List<Task> findByBoardIdOrderByPositionAsc(UUID boardId);

	List<Task> findByColumnIdOrderByPositionAsc(UUID columnId);
}
