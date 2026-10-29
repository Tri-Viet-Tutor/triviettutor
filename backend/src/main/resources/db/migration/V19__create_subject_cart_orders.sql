CREATE TABLE subjects (
 id BIGSERIAL PRIMARY KEY,
 name VARCHAR(100) NOT NULL UNIQUE CHECK (length(trim(name)) > 0)
);
INSERT INTO subjects(name) SELECT DISTINCT upper(trim(subject)) FROM courses;
ALTER TABLE courses ADD COLUMN subject_id BIGINT REFERENCES subjects(id) ON DELETE RESTRICT;
UPDATE courses c SET subject_id=s.id, subject=s.name FROM subjects s WHERE upper(trim(c.subject))=s.name;
ALTER TABLE courses ALTER COLUMN subject_id SET NOT NULL;
CREATE INDEX idx_courses_subject_id ON courses(subject_id);
CREATE TABLE carts (
 id BIGSERIAL PRIMARY KEY,
 student_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
 version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0)
);
CREATE TABLE cart_items (
 id BIGSERIAL PRIMARY KEY,
 cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
 subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
 added_at TIMESTAMP WITH TIME ZONE NOT NULL,
 UNIQUE(cart_id,subject_id)
);
CREATE TABLE orders (
 id BIGSERIAL PRIMARY KEY,
 student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 status VARCHAR(30) NOT NULL CHECK(status IN ('PENDING_PAYMENT','PAID','CANCELLED','EXPIRED','PARTIALLY_REFUNDED','REFUNDED')),
 total_amount NUMERIC(18,0) NOT NULL CHECK(total_amount>0),
 refunded_amount NUMERIC(18,0) NOT NULL DEFAULT 0 CHECK(refunded_amount>=0 AND refunded_amount<=total_amount),
 cart_version BIGINT NOT NULL CHECK(cart_version>=0),
 created_at TIMESTAMP WITH TIME ZONE NOT NULL,
 expires_at TIMESTAMP WITH TIME ZONE NOT NULL CHECK(expires_at>created_at),
 paid_at TIMESTAMP WITH TIME ZONE,
 cancelled_at TIMESTAMP WITH TIME ZONE,
 cancellation_reason VARCHAR(1000),
 CHECK ((status IN ('PENDING_PAYMENT','EXPIRED') AND paid_at IS NULL AND cancelled_at IS NULL AND refunded_amount=0)
 OR (status='CANCELLED' AND paid_at IS NULL AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL AND length(trim(cancellation_reason))>0 AND refunded_amount=0)
 OR (status='PAID' AND paid_at IS NOT NULL AND cancelled_at IS NULL AND refunded_amount=0)
 OR (status='PARTIALLY_REFUNDED' AND paid_at IS NOT NULL AND cancelled_at IS NULL AND refunded_amount>0 AND refunded_amount<total_amount)
 OR (status='REFUNDED' AND paid_at IS NOT NULL AND cancelled_at IS NULL AND refunded_amount=total_amount))
);
CREATE INDEX idx_orders_student_created ON orders(student_id,created_at,id);
CREATE INDEX idx_orders_status_created ON orders(status,created_at,id);
CREATE TABLE order_items (
 id BIGSERIAL PRIMARY KEY,
 order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
 cart_item_id BIGINT NOT NULL,
 subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
 course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
 class_id BIGINT NOT NULL REFERENCES class_groups(id) ON DELETE RESTRICT,
 subject_name VARCHAR(100) NOT NULL,
 course_name VARCHAR(200) NOT NULL,
 class_code VARCHAR(200),
 unit_price NUMERIC(15,0) NOT NULL CHECK(unit_price>0),
 payment_id BIGINT UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
 enrollment_id BIGINT UNIQUE REFERENCES enrollments(id) ON DELETE RESTRICT,
 UNIQUE(order_id,class_id), UNIQUE(order_id,cart_item_id), UNIQUE(id,order_id),
 CHECK ((payment_id IS NULL AND enrollment_id IS NULL) OR (payment_id IS NOT NULL AND enrollment_id IS NOT NULL))
);
ALTER TABLE payments ADD COLUMN order_id BIGINT REFERENCES orders(id) ON DELETE RESTRICT;
ALTER TABLE payments ADD COLUMN order_item_id BIGINT;
ALTER TABLE payments ADD CONSTRAINT fk_payment_order_item FOREIGN KEY(order_item_id,order_id) REFERENCES order_items(id,order_id);
ALTER TABLE payments ADD CONSTRAINT chk_payment_order_pair CHECK ((order_id IS NULL AND order_item_id IS NULL) OR (order_id IS NOT NULL AND order_item_id IS NOT NULL));
CREATE UNIQUE INDEX uq_order_item_paid ON payments(order_item_id) WHERE order_item_id IS NOT NULL AND status<>'FAILED';
CREATE INDEX idx_payments_order ON payments(order_id,id);
CREATE TABLE order_request_keys (
 id BIGSERIAL PRIMARY KEY,
 actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 operation VARCHAR(20) NOT NULL CHECK(operation IN ('CHECKOUT','PAY','CANCEL')),
 request_key VARCHAR(100) NOT NULL,
 fingerprint VARCHAR(64) NOT NULL,
 order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
 response TEXT NOT NULL,
 UNIQUE(actor_id,operation,request_key)
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_request_keys ENABLE ROW LEVEL SECURITY;
